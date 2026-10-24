# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

macOS·Windows Raycast extension. 클립보드 이미지·파일을 SSH로 원격 서버에 보내고 원격 경로를 클립보드에 복사한다 — 원격 Claude Code/CLI 세션에 스크린샷을 붙여넣기 위한 도구. 반대 방향(Pull)도 지원. 파일 전송은 양 플랫폼 공통 picker 폼(macOS는 Finder 선택이 프리필, Windows는 대화상자 제약으로 Folders·Files 2필드).

## Commands

```bash
npm run build      # ray build -e dist
npm run dev        # ray develop (Raycast에 라이브 로드)
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
npm test           # vitest run (tests/ 전체)
npx vitest run tests/validate.test.ts          # 단일 파일
npx vitest run -t "rejects .. segments"        # 이름 매칭 단일 테스트
```

## 아키텍처

3계층 — 순수 로직과 side effect를 분리하고, 테스트는 순수 계층만 커버한다:

| 계층 | 위치 | 내용 |
|------|------|------|
| Command 진입점 | `src/*.ts(x)` | package.json `commands`에 선언된 4개 커맨드 |
| Runtime (side effect) | `src/runtime/` | `system.ts` — 플랫폼 중립 오케스트레이션(ssh/scp spawn, `~/.ssh` config 쓰기, 신뢰 관문). `platform/{darwin,win32}.ts` — OS별 프리미티브(클립보드 추출, PW 저장/askpass, 키 설치, reveal)를 `PlatformAdapter`로 이원화. `store.ts` — LocalStorage (recents, host별 authMode) |
| Pure lib | `src/lib/` | argv 빌더(`transferArgs`), 검증(`validate`), managed config 텍스트 파싱(`sshConfigText`), `keychainCmd`, `mergeHosts`, `finderFiles`, `launchContext`, `askpassScript` — Raycast/Node API 의존 없음 |

`tests/`(vitest)는 `src/lib/`만 대상. 새 로직은 가능하면 lib에 순수 함수로 넣고 테스트를 붙인다. runtime/커맨드 계층은 unit test가 없다.

### 커맨드 라우팅 (v2 구조)

host는 커맨드 인자가 아니라 **Raycast launchContext(딥링크/Quicklink)** 로 전달된다.

- `send-clipboard-image`, `pull-file` (no-view): context에 `host`가 있으면 즉시 전송, 없으면 `launchCommand`로 `send-file-to-server`에 위임 (`payload: "clipboard" | "pull"`).
- `send-file-to-server` (view): 공유 서버 셀렉터(clipboard/pull 위임) 겸 파일 전송 폼(`SendFilesForm` — 파일·폴더 picker + 서버, macOS는 Finder 선택 프리필). `parseSelectorContext`(`src/lib/launchContext.ts`)가 비신뢰 context를 정규화. 파일 목록은 절대 context로 받지 않고 실행 시점 폼 제출로만 받는다.
- `add-server` (view): `~/.ssh/ssh_image_drop_config`에 managed 블록(`# >>>`/`# <<<` 마커) upsert + Keychain 저장 또는 `ssh-copy-id` 키 설치.

### 보안 불변식 (변경 시 반드시 유지)

- **딥링크 host 신뢰 관문**: 모든 딥링크 유입 host는 `isValidHost`(구문) → `ensureKnownHost`(known 집합 = managed ∪ recents ∪ `~/.ssh/config` ∪ additionalHosts) 2단 검증. fail-closed. 딥링크를 소비하는 새 커맨드도 반드시 이 관문을 통과시킨다 (`src/runtime/system.ts:152-183`).
- **비밀번호는 argv·평문 디스크·LocalStorage에 절대 노출 금지**: `SSH_ASKPASS` helper로 조회. macOS는 Keychain + 1회용 FIFO, Windows는 DPAPI(사용자 단위 암호화) blob + 1회용 임시 blob — 저장물은 항상 암호문, 평문 전달은 stdin/FIFO만.
- **경로 검증**: 원격 경로·basename은 `validateRemotePath`/`isSafeRemoteDir`/`isSafeBasename`(`src/lib/validate.ts`)로 shell 실행 문자·제어문자·`..`·루트/홈 전체 pull 거부. 실무 파일명 문자(`[ ] ( ) { } ! '`)는 허용하되 scp 원격 경로는 `globEscape`로 glob 문자를 literal 고정, 거부 시 알림에 원인 문자를 명시(`findUnsafeChar`/`basenameIssue`). 원격 shell 명령은 `shQuote` escaping, `~/` prefix는 quote 밖에 유지(`shQuotePath`).
- **`~/.ssh` 쓰기**: `writeFileAtomicNoSymlink`(symlink 거부 + temp 후 atomic rename)만 사용. 메인 config에는 Include 1줄만, 사용자 동의 + 백업 후 추가.
- 바이너리는 절대경로 고정(macOS `/usr/bin/*`, Windows `C:\Windows\System32\OpenSSH\*`·powershell.exe), `scp`는 SFTP 프로토콜 전제(macOS 13+ / Windows OpenSSH 9.0+).

### Auth 모드

host별 `"key" | "keychain"`이 LocalStorage에 저장(`store.ts`) — `"keychain"`은 "저장 PW 모드"의 저장값 명칭으로 Windows(DPAPI)에서도 그대로 쓴다(마이그레이션 회피). key 모드는 `BatchMode=yes`, keychain 모드는 askpass + `PubkeyAuthentication=no`. ssh/scp 옵션 조합은 `src/lib/transferArgs.ts`의 `authOpts`가 단일 소스.

## 컨벤션

- 코드 주석은 한국어로, 보안 결정의 WHY(왜 이 방어가 필요한가)를 남기는 스타일을 따른다.
- `raycast-env.d.ts`는 Raycast가 manifest에서 자동 생성 — 수동 편집 금지. preferences 타입은 `getPreferenceValues<Preferences>()`로 이 파일을 사용한다.
- manifest(커맨드·preferences)는 package.json이 단일 소스. README의 사용자 문서(특히 threat model 섹션)와 동작 변경을 동기화한다.
