import { homedir } from "os";
import { join } from "path";

/** 전송 대상 host — ssh alias, user@host, IPv4. 선행 -/./@ 차단(옵션 주입 방지). IPv6 미지원(README 고지). */
const HOST_RE = /^[A-Za-z0-9_][A-Za-z0-9_.@-]*$/;
/** 등록용 alias·User — ssh Host 매칭 이름/계정명이므로 @ 불허. config 문법 오염 방지. */
const NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
/**
 * 제어문자 + shell 실행력을 갖는 metachar. 이 확장의 sink는 argv spawn(로컬 shell 미경유)·
 * SFTP scp(원격 shell 미경유)·shQuote된 ssh 명령뿐이라 1차 방어는 quoting이지만,
 * 미래 코드가 quoting을 놓칠 경우를 대비한 방어 심층으로 원천 거부한다.
 * 실무 파일명에 흔한 [ ] ( ) { } ! ' 공백·유니코드는 허용 — glob 문자([ ] { })는
 * scp 원격 경로에서 globEscape로 literal 고정된다 (transferArgs).
 */
// eslint-disable-next-line no-control-regex -- 제어문자 거부는 의도된 보안 검증
const UNSAFE_PATH_RE = /[\x00-\x1f\x7f;&|`$<>\\"*?]/;

/**
 * 경로에서 허용되지 않는 문자 1개를 사람이 읽을 표기로 반환 (거부 알림용) — 없으면 null.
 * 제어문자는 눈에 보이지 않으므로 코드포인트로 표기한다.
 */
export function findUnsafeChar(s: string): string | null {
  const m = UNSAFE_PATH_RE.exec(s);
  if (!m) return null;
  const c = m[0];
  return c < " " || c === "\x7f"
    ? `a control character (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")})`
    : `"${c}"`;
}

export function isValidHost(v: string): boolean {
  return HOST_RE.test(v);
}

export function isValidName(v: string): boolean {
  return NAME_RE.test(v);
}

export function isValidPort(v: string): boolean {
  if (!/^\d+$/.test(v)) return false;
  const n = Number(v);
  return n >= 1 && n <= 65535;
}

/** 원격 shell용 single-quote escaping — Send 원격 명령 전용 (Pull은 원격 shell 미경유라 불필요) */
export function shQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/**
 * scp(SFTP) 원격 경로 escaping — SFTP도 원격 경로를 서버측 glob으로 매칭하므로, 허용된
 * glob/브레이스 문자([ ] { })를 backslash로 literal 고정한다 (예: `[회의]`가 문자 클래스로
 * 해석돼 매칭 실패하는 것 방지). `\` 자체는 UNSAFE_PATH_RE가 거부하므로 이중 escape 없음.
 * shQuote 경유 ssh 명령에는 쓰지 않는다 — single quote 안에서 glob은 애초에 안 돈다.
 */
export function globEscape(p: string): string {
  return p.replace(/[[\]{}]/g, "\\$&");
}

export function remoteBasename(p: string): string {
  return p.replace(/\/+$/, "").split("/").pop() ?? "";
}

/**
 * 로컬 파일 경로의 basename. remoteBasename과 달리 `/`·`\` 양쪽 구분자를 처리한다 —
 * Windows 로컬 경로(`C:\dir\file`)를 remoteBasename에 넣으면 `/`가 없어 경로 전체가 basename이
 * 되고, 그 안의 `\`·`:`가 isSafeBasename에서 거부되어 전송 대상이 통째로 스킵되기 때문.
 * OS 비의존(경로 문자열만 보고 판단)이라 테스트가 플랫폼 독립적이다.
 */
export function localBasename(p: string): string {
  const s = p.replace(/[/\\]+$/, "");
  const idx = Math.max(s.lastIndexOf("/"), s.lastIndexOf("\\"));
  return idx >= 0 ? s.slice(idx + 1) : s;
}

/**
 * Pull 원격 경로 검증 — 통과 시 null, 실패 시 에러 메시지. 비신뢰 입력(클립보드·딥링크) 방어.
 * `~/`는 scp(SFTP) expand-path 확장이 서버 측에서 홈으로 해석 — 원격 shell 미경유라 안전.
 * 파일·폴더 모두 허용(scp -r). 단 루트(`/`·`~/`) 전체 pull은 거부.
 */
export function validateRemotePath(p: string): string | null {
  if (!/^(\/|~\/)/.test(p)) return "Remote path must start with / or ~/ .";
  const bad = findUnsafeChar(p);
  if (bad) return `Path contains an unsupported character: ${bad}.`;
  if (p.split("/").some((s) => s === "." || s === ".."))
    return "Remote path must not contain . or .. segments.";
  // 루트("/")·홈("~/") 자체는 거부 — 전체 파일시스템/홈 재귀 pull 방지
  // (후행 슬래시 strip 후 비교: "~/"는 basename이 "~"로 남아 basename 검사로는 못 거른다)
  const stem = p.replace(/\/+$/, "");
  if (stem === "" || stem === "~")
    return "Remote path must point to a file or folder.";
  return null;
}

/** remoteDir 안전성 — 절대경로 또는 서버 home(`~/`) + metachar/`..` 없음. `~foo`·상대경로는 거부. */
export function isSafeRemoteDir(dir: string): boolean {
  if (!/^(\/|~\/)/.test(dir)) return false;
  if (UNSAFE_PATH_RE.test(dir)) return false;
  return !dir.split("/").some((s) => s === "." || s === "..");
}

/**
 * basename 스킵 사유 (알림용) — 안전하면 null. 거부 정책의 단일 소스이며
 * isSafeBasename은 이 함수의 boolean 뷰다 (사유 문구와 판정이 어긋나지 않게).
 */
export function basenameIssue(name: string): string | null {
  if (name === "" || name === "." || name === "..") return "invalid name";
  if (name.startsWith("-")) return `name starts with "-"`;
  const bad = findUnsafeChar(name);
  return bad ? `name contains ${bad}` : null;
}

/** Finder 파일 basename 안전성 — 원격 경로 <dir>/<basename> 주입 방지. 선행 `-`·`.`/`..`도 거부. */
export function isSafeBasename(name: string): boolean {
  return basenameIssue(name) === null;
}

/**
 * pull 로컬 저장 파일명 정규화. Windows(NTFS/Win32)에서 예약 장치명(CON·NUL·COM1…)은
 * 파일이 아닌 장치로 열리고, `:`는 ADS(대체 데이터 스트림)를 만들며, 후행 점·공백은
 * 자동 절단된다 — 전부 리눅스 원격에선 합법인 이름이라 pull 시 로컬 규칙으로만 정규화한다.
 * (그 외 금지 문자 \\ " < > | * ?는 UNSAFE_PATH_RE가 원격 경로 단계에서 이미 거부)
 * POSIX 클라이언트는 원본 그대로.
 */
export function sanitizeLocalName(name: string, windows: boolean): string {
  if (!windows) return name;
  const n = name.replace(/:/g, "_").replace(/[. ]+$/, "");
  const stem = n.split(".")[0] ?? "";
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)) return `file-${n}`;
  return n === "" ? "file" : n;
}

export function expandTilde(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/** 클립보드 이미지 크기 상한 — 초과분은 전송 시작 전에 거부한다 */
export const CLIPBOARD_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/** 상한 초과 시 알림 문구, 이하면 null */
export function clipboardImageSizeIssue(bytes: number): string | null {
  if (bytes <= CLIPBOARD_IMAGE_MAX_BYTES) return null;
  const limit = CLIPBOARD_IMAGE_MAX_BYTES / 1024 / 1024;
  return `Clipboard image is ${(bytes / 1024 / 1024).toFixed(1)} MB — the limit is ${limit} MB`;
}

/**
 * 붙여넣어도 안전한 경로인지 — 비었거나 제어문자가 있으면 거부한다. 셸은 개행·CR을 입력
 * 확정으로 해석하므로 경로가 명령으로 실행될 수 있다. 생성된 원격 경로만 전달되는 현재
 * 스코프에선 도달 불가하나(remoteDir는 isSafeRemoteDir가 이미 거른다) 방어로 유지한다.
 */
export function isPasteSafePath(text: string): boolean {
  return text !== "" && findUnsafeChar(text) === null;
}

/**
 * appPicker preference와 getFrontmostApplication()이 공통으로 갖는 앱 식별자.
 * 플랫폼·API에 따라 채워지는 필드가 달라 전부 optional이다.
 */
export interface AppRef {
  name?: string;
  path?: string;
  bundleId?: string;
  windowsAppId?: string;
}

/**
 * 두 앱이 같은지. 강한 식별자부터 보고, 같은 단계 식별자가 양쪽에 있으면 그 단계에서 판정을
 * 끝낸다 — 값이 다른데 약한 식별자로 내려가면 서로 다른 앱을 같다고 볼 수 있다
 * (예: VS Code와 VS Code Insiders는 name이 겹칠 수 있으나 bundleId가 다르다).
 * 한쪽이라도 없으면 false — 대상을 확인 못 한 채 붙여넣지 않는다(fail-closed).
 */
export function isSameApp(
  a: AppRef | undefined,
  b: AppRef | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.windowsAppId && b.windowsAppId)
    return a.windowsAppId === b.windowsAppId;
  if (a.bundleId && b.bundleId) return a.bundleId === b.bundleId;
  if (a.path && b.path) return a.path === b.path;
  return !!a.name && a.name === b.name;
}

/**
 * 클립보드 텍스트 정규화 — CRLF → LF. 단독 CR은 건드리지 않는다(의도적으로 CR을 넣은
 * 원문까지 바꾸면 변형 범위가 Windows 문제보다 넓어진다).
 * Windows 클립보드 텍스트는 CRLF이고, 그대로 pbcopy에 흘리면 원격 붙여넣기마다 ^M이 섞인다.
 */
export function normalizeClipboardText(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

/** 클립보드 텍스트 크기 상한 — 이미지와 동일. 무제한은 Raycast 메모리·stdin 버퍼·원격 pasteboard를 함께 압박한다 */
export const CLIPBOARD_TEXT_MAX_BYTES = 20 * 1024 * 1024;

/** 상한 초과 시 알림 문구, 이하면 null. 크기는 정규화 후 실제 전송 바이트 기준 */
export function clipboardTextSizeIssue(bytes: number): string | null {
  if (bytes <= CLIPBOARD_TEXT_MAX_BYTES) return null;
  const limit = CLIPBOARD_TEXT_MAX_BYTES / 1024 / 1024;
  return `Clipboard text is ${(bytes / 1024 / 1024).toFixed(1)} MB — the limit is ${limit} MB`;
}

/**
 * 원격 클립보드에 무엇을 보낼지 — 텍스트 우선. 순수 케이스는 상호 배타적이라 순서가 무관하고,
 * 갈리는 것은 혼합 클립보드(스프레드시트 셀·서식 텍스트)뿐이다. 거기서 이미지를 택하면
 * 이 기능의 존재 이유인 "문자열 붙여넣기"가 무너지므로 텍스트를 택한다 (의도적 trade-off —
 * 브라우저 이미지 복사처럼 텍스트를 동반하는 이미지는 텍스트로 간다).
 */
export function pickClipboardKind(has: {
  hasText: boolean;
  hasImage: boolean;
}): "text" | "image" | null {
  if (has.hasText) return "text";
  return has.hasImage ? "image" : null;
}

/** 전송량 표기 — 원격 클립보드 HUD·확인 알림용 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 전송할 내용의 출처. 원격 명령은 selection·text를 똑같이 pbcopy로 보내지만(둘 다 문자열),
 * 사용자에게는 구분해 보여준다 — 블록을 지정해 둔 채 실행했는데 클립보드가 갔다면
 * 그 사실을 즉시 알아야 하기 때문이다.
 */
export type PayloadSource = "selection" | "text" | "image";

const SOURCE_LABEL: Record<PayloadSource, string> = {
  selection: "Selection",
  text: "Text",
  image: "Image",
};

/**
 * "Selection (42 B)" / "Text (1.2 KB)" / "Image (34.0 KB)" — 무엇이 나갔는지 즉시 알게 한다.
 * 선택 텍스트를 클립보드보다 우선하는 것도, 혼합 클립보드에서 텍스트를 택하는 것도
 * 의도적 선택이므로(pickPayloadSource·pickClipboardKind), 오라우팅을 방어 코드 대신
 * 이 표기로 인지시킨다.
 */
export function clipboardKindLabel(
  source: PayloadSource,
  bytes: number,
): string {
  return `${SOURCE_LABEL[source]} (${formatBytes(bytes)})`;
}

/**
 * 보낼 내용의 출처 결정 — 선택 텍스트 우선. 블록 지정은 "이걸 보내겠다"는 명시적 행위라
 * 클립보드(과거에 복사해 둔 것)보다 지금 의도에 가깝다. 지정해 둔 채 실행했는데 클립보드가
 * 가는 쪽이 더 놀랍다.
 *
 * 선택 텍스트가 없는 경우(미지정·앱 미지원·권한 없음)는 전부 "없음"으로 접히고 기존
 * 클립보드 경로가 그대로 동작한다 — 이 기능이 실패해도 커맨드가 퇴화하지 않는다.
 */
export function pickPayloadSource(has: {
  hasSelection: boolean;
  hasText: boolean;
  hasImage: boolean;
}): PayloadSource | null {
  if (has.hasSelection) return "selection";
  return pickClipboardKind(has);
}

/**
 * 보낼 텍스트도 이미지도 없을 때의 안내. "빈 클립보드"와 "지원하지 않는 형식"(PDF-only,
 * file promise 등)을 구분하지 않는다 — 구분하려면 플랫폼별 pasteboard 타입 열거 API가
 * 필요한데 어댑터 계약에 없고, 그것만을 위해 어댑터를 넓힐 이득이 없다.
 */
export const EMPTY_CLIPBOARD_HINT =
  "Copy some text or an image first — the clipboard has nothing this command can send.";
