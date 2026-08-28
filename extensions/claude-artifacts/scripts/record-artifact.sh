#!/bin/bash
#
# Claude Code PostToolUse hook — record published artifacts to a local index.
#
# This is the ONLY thing that writes ~/.claude/artifacts.json. It is kept in
# scripts/ rather than hidden inside the extension bundle so you can read
# exactly what runs on your machine before installing it. It makes no network
# calls, reads nothing but its stdin payload, and writes nothing but the index
# and its own log.
#
# Install: copy to ~/.claude/hooks/record-artifact.sh, chmod +x, then add to
# ~/.claude/settings.json under hooks.PostToolUse (APPEND, never replace):
#
#   {
#     "matcher": "Artifact",
#     "hooks": [
#       { "type": "command", "command": "$HOME/.claude/hooks/record-artifact.sh", "timeout": 10 }
#     ]
#   }
#
# Requires: jq. Exits quietly if it is missing.
#
# Contract: this hook must NEVER block or fail a real Claude Code turn. Every
# path exits 0, and all output goes to stderr (which Claude Code discards) so a
# stray stdout write can't be read as hook feedback.
#
# Reads the PostToolUse payload on stdin: tool_name, tool_input, tool_response,
# session_id, tool_use_id, cwd.

set -uo pipefail

INDEX="${HOME}/.claude/artifacts.json"
LOG="${HOME}/.claude/artifacts-hook.log"

# Bail out quietly rather than erroring if jq is unavailable — this hook is
# best-effort, and a missing dependency must not surface as a turn failure.
command -v jq >/dev/null 2>&1 || exit 0

PAYLOAD="$(cat)" || exit 0
[ -n "${PAYLOAD}" ] || exit 0

log() {
  # Keep a small breadcrumb trail; failure to log is itself non-fatal.
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$1" >>"${LOG}" 2>/dev/null || true
}

# Only record successful publishes. An `action: "list"` call returns other
# people's artifacts too, and recording those would pollute the index with rows
# the user never created.
ACTION="$(printf '%s' "${PAYLOAD}" | jq -r '.tool_input.action // "publish"' 2>/dev/null)" || exit 0
case "${ACTION}" in
  publish | "") ;;
  *)
    log "skip: action=${ACTION}"
    exit 0
    ;;
esac

CWD="$(printf '%s' "${PAYLOAD}" | jq -r '.cwd // empty' 2>/dev/null)"

# The `Artifact` tool_response shape is undocumented, so locate the URL by
# pattern rather than by field name. Prefer the known response keys, but always
# extract via the regex: a string-shaped response embeds the URL in prose
# ("Published to <url> successfully"), and taking the field whole would drag the
# trailing words into the id.
URL_PATTERN='https://claude\.ai/(code/)?artifact/[0-9a-fA-F-]{36}'

CANDIDATE="$(
  printf '%s' "${PAYLOAD}" | jq -r '
    [ .tool_response?
      | if type == "string" then . else (.url? // .artifact?.url? // .link? // empty) end
    ] | map(select(type == "string")) | first // empty
  ' 2>/dev/null
)"

URL="$(printf '%s' "${CANDIDATE}" | grep -oE "${URL_PATTERN}" | head -1)"

# Unrecognised response shape — search every string ANYWHERE under
# `tool_response`, at any depth.
#
# Scoped to `tool_response` deliberately: `tool_input` carries the user's own
# `title`/`description`, and a description that merely MENTIONS an artifact URL
# would otherwise be picked up and recorded as this publish's identity —
# overwriting that older artifact's row while the real new one is never
# recorded. Only the tool's own response says which artifact was just created.
if [ -z "${URL}" ]; then
  URL="$(
    printf '%s' "${PAYLOAD}" | jq -r '
      [ .tool_response? | .. | strings ] | join("\n")
    ' 2>/dev/null | grep -oE "${URL_PATTERN}" | head -1
  )"
fi

if [ -z "${URL}" ]; then
  log "no artifact URL found in payload; nothing recorded"
  exit 0
fi

ID="${URL##*/}"
[ -n "${ID}" ] || exit 0

# Title precedence, ordered by how useful the value actually is for finding an
# artifact again months later.
#
# Observed payload (2026-07-25): `tool_response.title` is the source FILENAME
# ("probe-throwaway.md"), not the page's <title>. A filename is a poor retrieval
# cue and several are indistinguishable ("index.html"), so an explicit
# `tool_input.title` comes first, then the human-written
# `tool_input.description`, and the filename is only a fallback.
#
# A bare filename still beats nothing, and the id beats an empty row.
TITLE="$(
  printf '%s' "${PAYLOAD}" | jq -r '
    [ .tool_input?.title?,
      .tool_input?.description?,
      (.tool_response? | if type == "object" then (.title? // .name?) else empty end)
    ]
    | map(select(type == "string" and (. | ltrimstr(" ") | length) > 0))
    | first // empty
  ' 2>/dev/null
)"
[ -n "${TITLE}" ] && [ "${TITLE}" != "null" ] || TITLE="${ID}"

# Keep list rows readable: a description can be a full sentence, and an
# over-long title crowds the accessory out of a narrow Raycast window.
if [ "${#TITLE}" -gt 120 ]; then
  TITLE="$(printf '%.117s...' "${TITLE}")"
fi

# The index's `updated` is the local publish DATE, stamped here.
#
# Do not wire this to `tool_response.updated` — despite the identical name, that
# field is a BOOLEAN (false = first publish, true = republish of an existing
# URL), not a timestamp. Copying it through would put `true` where the reader
# expects YYYY-MM-DD and silently break recency sorting.
UPDATED="$(date '+%Y-%m-%d')"
PROJECT=""
[ -n "${CWD}" ] && PROJECT="$(basename "${CWD}")"

mkdir -p "$(dirname "${INDEX}")" 2>/dev/null || exit 0

# Serialize concurrent invocations. The read-modify-write below is not atomic on
# its own: an atomic `mv` prevents a *corrupt* file, but two hooks that both read
# before either writes will still lose one update — and artifacts get published
# in bursts.
#
# The lock is a KERNEL-BACKED advisory lock (`perl -e flock`), not a lockfile.
# macOS has no `flock(1)`, but it ships perl, whose `flock` is `flock(2)`.
#
# This matters because the obvious portable alternative — `mkdir` as a
# test-and-set plus an age-based reaper for abandoned locks — is unfixable. A
# lockfile's mtime tells you how old it is, never whether its owner is alive, so
# any reaper threshold can delete a LIVE lock: a writer that is merely SLOW
# (SIGSTOP, laptop sleep, a suspended process, heavy paging) looks identical to
# a dead one. Two writers then enter the critical section and one update is
# silently lost. Without a reaper the same design deadlocks instead — one
# SIGKILLed hook drops every later publish.
#
# The kernel resolves both: it releases the lock when the holder dies, for any
# reason, with no timeout to tune. Verified 2026-07-25 — SIGKILL a holder and
# the next waiter acquires immediately.
#
# The whole critical section runs inside the perl process below, which holds the
# lock for exactly as long as it runs. `alarm` bounds the wait so a stuck holder
# degrades to a skipped record rather than a hung Claude Code turn.
#
# No perl → fall back to serialising nothing. A missing interpreter must not
# fail the turn, and a lost row is better than a corrupt index.
LOCK="${INDEX}.lock"
LOCK_TIMEOUT=10

command -v perl >/dev/null 2>&1 || {
  log "perl unavailable; cannot lock safely, skipped ${ID}"
  exit 0
}

# Everything that touches the index happens inside this perl-held lock. The
# helper runs `sh -c` with the arguments exported, so the shell body below is
# ordinary POSIX sh.
#
# Exit codes: 0 recorded · 75 lock unavailable · 1 write failed.
LOCK_STATUS=0
ARTIFACT_ID="${ID}" \
  ARTIFACT_TITLE="${TITLE}" \
  ARTIFACT_URL="${URL}" \
  ARTIFACT_UPDATED="${UPDATED}" \
  ARTIFACT_PROJECT="${PROJECT}" \
  ARTIFACT_CWD="${CWD}" \
  ARTIFACT_INDEX="${INDEX}" \
  perl -e '
    use Fcntl qw(:flock);
    my ($lockfile, $timeout, $script) = @ARGV;
    open(my $fh, ">>", $lockfile) or exit 75;
    eval {
      local $SIG{ALRM} = sub { die "timeout\n" };
      alarm $timeout;
      flock($fh, LOCK_EX) or die "flock\n";
      alarm 0;
      1;
    } or exit 75;
    # Lock held for the lifetime of this process; the kernel drops it on exit,
    # including SIGKILL. Nothing to clean up, no stale lock to reap.
    my $rc = system("/bin/sh", "-c", $script);
    exit($rc == 0 ? 0 : 1);
  ' "${LOCK}" "${LOCK_TIMEOUT}" '
    set -u
    INDEX="${ARTIFACT_INDEX}"

    # Initialise atomically. A direct redirection here can be interrupted
    # mid-write and leave a malformed file that later runs will not repair,
    # because they only check that it is non-empty.
    if [ ! -s "${INDEX}" ]; then
      INIT="$(mktemp "${INDEX}.XXXXXX")" || exit 1
      printf "{\"version\":1,\"artifacts\":[]}" >"${INIT}" || { rm -f "${INIT}"; exit 1; }
      mv -f "${INIT}" "${INDEX}" || { rm -f "${INIT}"; exit 1; }
    fi

    TMP="$(mktemp "${INDEX}.XXXXXX")" || exit 1
    trap "rm -f \"${TMP}\"" EXIT

    # Upsert by id — republishing reuses the same URL, so a blind append would
    # accumulate duplicates. Existing fields are preserved and only the
    # newly-observed ones overwritten.
    jq \
      --arg id "${ARTIFACT_ID}" \
      --arg title "${ARTIFACT_TITLE}" \
      --arg url "${ARTIFACT_URL}" \
      --arg updated "${ARTIFACT_UPDATED}" \
      --arg project "${ARTIFACT_PROJECT}" \
      --arg cwd "${ARTIFACT_CWD}" \
      "
      def entry:
        { id: \$id, title: \$title, url: \$url, updated: \$updated, owner: \"mine\" }
        + (if \$project == \"\" then {} else { project: \$project } end)
        + (if \$cwd == \"\" then {} else { cwd: \$cwd } end);

      # Tolerate a bare array or a missing/non-array \`artifacts\` key.
      (if type == \"array\" then { version: 1, artifacts: . } else . end)
      | .version = (.version // 1)
      | .artifacts = ((.artifacts // []) | if type == \"array\" then . else [] end)
      | .artifacts = (
          # Collapse to ONE row per id. A file that already contains duplicates
          # — hand-edited, or written by an older append-only version — would
          # otherwise have every copy updated in place and stay duplicated.
          (.artifacts | map(select((type == \"object\") and (.id? == \$id)))) as \$existing
          | (.artifacts | map(select((type != \"object\") or (.id? != \$id)))) as \$others
          | if (\$existing | length) > 0
            then \$others + [ (\$existing | add) + entry ]
            else \$others + [entry]
            end
        )
      " "${INDEX}" >"${TMP}" 2>/dev/null || exit 1

    [ -s "${TMP}" ] || exit 1
    mv -f "${TMP}" "${INDEX}" || exit 1
    trap - EXIT
    exit 0
  ' || LOCK_STATUS=$?

case "${LOCK_STATUS}" in
  0) log "recorded ${ID} (${TITLE}) project=${PROJECT:-none}" ;;
  75) log "could not acquire lock within ${LOCK_TIMEOUT}s; skipped ${ID}" ;;
  *) log "write failed for ${ID}; index left unchanged" ;;
esac

exit 0
