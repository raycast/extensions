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
