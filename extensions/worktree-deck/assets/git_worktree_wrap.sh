#!/usr/bin/env bash
set -euo pipefail

# 英語でエラーを出して終了する
fail() {
    printf 'Error: %s\n' "$1" >&2
    exit 1
}

# 余白を除去する
trim_spaces() {
    local value="$1"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    printf '%s' "${value}"
}

# 実行ディレクトリを決める
resolve_invoke_dir() {
    local override="${WORKTREE_REPO_ROOT:-}"
    if [[ -n "${override}" ]]; then
        printf '%s' "${override}"
        return
    fi
    printf '%s' "$(pwd)"
}

# 実行ディレクトリからリポジトリルートを解決する
resolve_repo_root() {
    local invoke_dir="$1"
    local repo_root
    repo_root="$(git -C "${invoke_dir}" rev-parse --show-toplevel 2>/dev/null)" || fail "Not a git repository: ${invoke_dir}"
    printf '%s' "${repo_root}"
}

# スクリプトの配置ディレクトリを返す
resolve_script_root() {
    local script_root
    script_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    printf '%s' "${script_root}"
}

# 先頭の ~ を home path へ展開する
expand_home_path() {
    local path="$1"
    local home_dir="${HOME:-}"
    case "${path}" in
        "~")
            [[ -n "${home_dir}" ]] || fail "HOME is not set."
            printf '%s' "${home_dir}"
            ;;
        \~/*)
            [[ -n "${home_dir}" ]] || fail "HOME is not set."
            printf '%s/%s' "${home_dir}" "${path#\~/}"
            ;;
        *)
            printf '%s' "${path}"
            ;;
    esac
}

# mapping.txt のパスを解決する
resolve_map_file() {
    local script_root="$1"
    local override="${WORKTREE_MAPPING_FILE:-}"
    local fallback
    if [[ -n "${override}" ]]; then
        printf '%s' "${override}"
        return
    fi
    fallback="${script_root}/mapping.txt"
    if [[ -f "${fallback}" ]]; then
        printf '%s' "${fallback}"
        return
    fi
    fail "Missing mapping file: ${fallback}"
}

# process env からキーに対応する値を取得する
read_env_value() {
    local key="$1"
    local from_env
    from_env="${!key:-}"
    if [[ -n "${from_env}" ]]; then
        printf '%s' "${from_env}"
        return
    fi
    printf ''
}

# worktree パス要素として使う文字列を正規化する
sanitize_path_segment() {
    local raw="$1"
    local value
    value="$(trim_spaces "${raw}")"
    value="${value//\//-}"
    value="${value//\\/-}"
    value="$(printf '%s' "${value}" | sed -E 's/[[:space:]]+/-/g; s/[[:cntrl:]<>:"|?*]+/-/g; s/-+/-/g; s/^[.-]+//; s/[.-]+$//')"
    printf '%s' "${value}"
}

# branch 名から worktree 配下の相対パスを作る
build_branch_path() {
    local branch="$1"
    local segment sanitized result
    local parts=()
    local IFS="/"
    read -r -a parts <<< "${branch}"
    for segment in "${parts[@]}"; do
        sanitized="$(sanitize_path_segment "${segment}")"
        [[ -n "${sanitized}" ]] || fail "Worktree branch path contains an invalid segment."
        if [[ -z "${result:-}" ]]; then
            result="${sanitized}"
        else
            result="${result}/${sanitized}"
        fi
    done
    [[ -n "${result:-}" ]] || fail "Worktree branch path contains an invalid segment."
    printf '%s' "${result}"
}

# worktree の作成先を組み立てる
build_worktree_path() {
    local base_path="$1"
    local map_value="$2"
    local branch="$3"
    local repo_segment branch_path
    base_path="${base_path%/}"
    repo_segment="$(sanitize_path_segment "${map_value}")"
    [[ -n "${repo_segment}" ]] || fail "Repository mapping is required."
    branch_path="$(build_branch_path "${branch}")"
    printf '%s/%s/%s' "${base_path}" "${repo_segment}" "${branch_path}"
}

# 作成先の親ディレクトリを用意する
ensure_parent_dir() {
    local dest="$1"
    local parent_dir
    parent_dir="$(dirname "${dest}")"
    mkdir -p "${parent_dir}"
}

# worktree を作成する
create_worktree() {
    local repo_root="$1"
    local dest="$2"
    local branch="$3"
    local start_point="$4"
    [[ ! -e "${dest}" ]] || fail "Destination already exists: ${dest}"
    if git -C "${repo_root}" show-ref --verify --quiet "refs/heads/${branch}"; then
        git -C "${repo_root}" worktree add "${dest}" "${branch}" >&2 || fail "Failed to create worktree."
        printf '%s' "existing"
    else
        git -C "${repo_root}" worktree add -b "${branch}" "${dest}" "${start_point}" >&2 || fail "Failed to create worktree."
        printf '%s' "created"
    fi
}

# 作成したブランチに baseRef を保存する
save_branch_base_ref() {
    local repo_root="$1"
    local branch="$2"
    local base_ref="$3"
    local escaped_branch config_key
    [[ -n "${repo_root}" ]] || return
    [[ -n "${branch}" ]] || return
    [[ -n "${base_ref}" ]] || return
    escaped_branch="${branch//\\/\\\\}"
    escaped_branch="${escaped_branch//\"/\\\"}"
    config_key="branch.\"${escaped_branch}\".worktreeDeckBaseRef"
    git -C "${repo_root}" config "${config_key}" "${base_ref}"
}

# baseRef を保存するべきか判定する
should_save_branch_base_ref() {
    local created_status="$1"
    local base_ref="$2"
    [[ "${created_status}" == "created" ]] || return 1
    [[ -n "${base_ref}" ]] || return 1
    [[ "${base_ref}" != "HEAD" ]] || return 1
    return 0
}

# rsync が --ignore-missing-args をサポートするか確認する
supports_rsync_ignore_missing() {
    rsync --help 2>/dev/null | grep -q -- '--ignore-missing-args'
}

# 存在するパスだけを抽出して一時ファイルに詰める
build_existing_files_list() {
    local repo_root="$1"
    local list_path rel source_path
    list_path="$(mktemp)"
    while IFS= read -r -d '' rel; do
        source_path="${repo_root}/${rel}"
        # 壊れたシンボリックリンクは除外する
        if [[ -L "${source_path}" && ! -e "${source_path}" ]]; then
            continue
        fi
        if [[ -e "${source_path}" || -L "${source_path}" ]]; then
            printf '%s\0' "${rel}" >> "${list_path}"
        fi
    done < <(git -C "${repo_root}" ls-files -z --others --ignored --exclude-standard)
    printf '%s' "${list_path}"
}

# 無視対象と未追跡ファイルをコピーする
copy_untracked_and_ignored() {
    local repo_root="$1"
    local dest="$2"
    (
        set -euo pipefail
        local list_path
        local rsync_args=()
        list_path="$(build_existing_files_list "${repo_root}")"
        # サブシェル終了時に一時ファイルを削除する
        trap 'rm -f "${list_path}"' EXIT
        rsync_args=(-a --from0 "--files-from=${list_path}")
        if supports_rsync_ignore_missing; then
            rsync_args+=(--ignore-missing-args)
        fi
        rsync "${rsync_args[@]}" "${repo_root}/" "${dest}/"
    )
}

# 引数を解析してブランチ・開始点・map_value を返す
parse_args() {
    local branch="" start_point="" map_value=""
    local has_start_point=0
    local arg
    while [[ $# -gt 0 ]]; do
        arg="$1"
        case "${arg}" in
            --map-value)
                shift
                [[ $# -gt 0 ]] || fail "Missing value for --map-value"
                map_value="$1"
                ;;
            --map-value=*)
                map_value="${arg#*=}"
                ;;
            -*)
                fail "Unknown option: ${arg}"
                ;;
            *)
                if [[ -z "${branch}" ]]; then
                    branch="${arg}"
                elif [[ "${has_start_point}" -eq 0 ]]; then
                    start_point="${arg}"
                    has_start_point=1
                else
                    fail "Too many arguments."
                fi
                ;;
        esac
        shift
    done
    [[ -n "${branch}" ]] || fail "Usage: git_worktree_wrap.sh <branch> [start-point] --map-value <value>"
    if [[ "${has_start_point}" -eq 0 ]]; then
        start_point="HEAD"
    fi
    if [[ -z "${map_value}" ]]; then
        fail "Missing --map-value for repository mapping."
    fi
    printf '%s\t%s\t%s' "${branch}" "${start_point}" "${map_value}"
}

main() {
    local branch start_point map_value
    local invoke_dir repo_root
    local script_root
    local base_path dest created_status
    local parsed

    parsed="$(parse_args "$@")"
    IFS=$'\t' read -r branch start_point map_value <<< "${parsed}"

    invoke_dir="$(resolve_invoke_dir)"
    repo_root="$(resolve_repo_root "${invoke_dir}")"
    script_root="$(resolve_script_root)"

    base_path="$(read_env_value "GIT_WORKTREE_PATH")"
    [[ -n "${base_path}" ]] || fail "GIT_WORKTREE_PATH is not set."
    base_path="$(expand_home_path "${base_path}")"
    dest="$(build_worktree_path "${base_path}" "${map_value}" "${branch}")"

    ensure_parent_dir "${dest}"
    created_status="$(create_worktree "${repo_root}" "${dest}" "${branch}" "${start_point}")"
    if should_save_branch_base_ref "${created_status}" "${start_point}"; then
        save_branch_base_ref "${repo_root}" "${branch}" "${start_point}"
    fi
    copy_untracked_and_ignored "${repo_root}" "${dest}"
    printf 'Created worktree: %s\n' "${dest}"
}

main "$@"
