/**
 * 원격 서버가 Windows(비POSIX 셸)인지 stderr 시그니처로 판별 — 순수 함수.
 *
 * 이 확장의 원격 명령(`mkdir -p`·`cat >`·`test -d`·`~/` 확장)은 POSIX 셸 전제다.
 * 원격이 Windows OpenSSH 서버(기본 셸 cmd.exe 또는 PowerShell)면 이 명령들이 깨지는데,
 * 그때 나오는 셸 고유 에러 문구를 잡아 사용자에게 "Windows 서버는 미지원"이라는 명확한
 * 진단을 주기 위한 것 — 지원 분기가 아니라 친절한 실패 메시지 전용(전송 성공 경로엔 무비용).
 */
export function looksLikeWindowsServer(stderr: string): boolean {
  const s = stderr.toLowerCase();
  // 원격 셸(cmd.exe/PowerShell)만이 내는 문구로 한정한다. 드라이브 경로(C:\…)나
  // "cannot find the path" 같은 범용 문구는 Windows **클라이언트**의 로컬 오류
  // (Bad owner on C:\Users\…, identity file 경고 등)에도 섞여 정상 Linux 서버를
  // 오진해 실제 원인을 은폐하므로 판정에 쓰지 않는다.
  return (
    // cmd.exe: 알 수 없는 명령(cat 등) / 잘못된 스위치(mkdir -p)
    s.includes("is not recognized as an internal or external command") ||
    s.includes("the syntax of the command is incorrect") ||
    // PowerShell: cmdlet 미해석
    s.includes("is not recognized as the name of a cmdlet") ||
    s.includes("commandnotfoundexception")
  );
}

/**
 * Windows 서버 감지 시 사용자에게 보여줄 안내 — 미지원 사유와 대안(POSIX 서버)을 명시.
 * Send 실패·Add Server(키 설치) 실패 양쪽에서 공유 (Windows는 클라이언트로만 지원).
 */
export const WINDOWS_SERVER_MESSAGE =
  "This server looks like Windows, which isn't supported — use a macOS or Linux server. " +
  "(Windows is supported only as the client running this extension.)";

/**
 * 원격에 pbcopy·osascript가 없을 때 — 원격 클립보드 주입은 macOS GUI 세션 전용이다.
 * OS를 단정하지 않고 원인을 서술한다: 명령 명세가 절대경로 + 존재 체크라 127은
 * "PATH 문제"가 아니라 "macOS 바이너리 부재"만을 뜻한다.
 */
export const NON_MAC_SERVER_MESSAGE =
  "Couldn't find pbcopy/osascript — the remote clipboard works only on a macOS server.";

/**
 * SSH 사용자가 GUI 세션을 갖고 있지 않을 때. 이 검사가 없으면 pbcopy가 exit 0을 내는데도
 * 사용자가 보고 있는 화면의 클립보드는 그대로인 silent failure가 된다 — 가장 진단하기 어려운 실패다.
 */
export const NO_GUI_SESSION_MESSAGE =
  "That SSH user has no GUI session on the server — log in on the server's screen (or connect as the logged-in user) and try again.";

/** 원격 클립보드 명령이 자체 검사에서 실패했음을 알리는 stderr 표식 (§6 명령이 출력) */
export const REMOTE_SENTINEL_NO_MAC = "SSHIMGDROP_NOMAC";
export const REMOTE_SENTINEL_NO_GUI = "SSHIMGDROP_NOGUI";

/**
 * 원격 종료 상태 분류. exit code만으로 원인을 단정하지 않는다 — 126은 sh·env가 "실행 불가"를
 * 보고할 때도, 127은 내부 명령 탐색 실패에서도 난다. 그래서 원격 명령이 자체 sentinel을
 * stderr로 내고, code와 sentinel이 **모두** 맞을 때만 전용 진단으로 매핑한다 (나머지는 fail-closed).
 */
export function classifyRemoteExit(
  code: number | null,
  stderr: string,
): "non-mac" | "no-gui" | "other" {
  if (code === 127 && stderr.includes(REMOTE_SENTINEL_NO_MAC)) return "non-mac";
  if (code === 126 && stderr.includes(REMOTE_SENTINEL_NO_GUI)) return "no-gui";
  return "other";
}

/**
 * 원격 종료 상태 → 사용자 메시지. 전용 진단이 없으면 null(호출부가 기존 sshFailure로 넘긴다).
 * close 핸들러의 분기를 순수 함수로 유지해 매핑이 뒤바뀌는 회귀를 단위 테스트로 잡는다 —
 * 실서버 없이 검증할 수 있는 마지막 지점이다.
 */
export function remoteExitMessage(
  code: number | null,
  stderr: string,
): string | null {
  switch (classifyRemoteExit(code, stderr)) {
    case "non-mac":
      return NON_MAC_SERVER_MESSAGE;
    case "no-gui":
      return NO_GUI_SESSION_MESSAGE;
    default:
      return null;
  }
}
