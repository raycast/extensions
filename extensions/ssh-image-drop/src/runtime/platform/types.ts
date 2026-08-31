/**
 * OS별 저수준 프리미티브 인터페이스 — system.ts의 오케스트레이션(전송 흐름·보안 관문·config 쓰기)은
 * 플랫폼 중립으로 유지하고, 실제로 갈라지는 지점만 여기로 모은다. 구현: darwin.ts / win32.ts.
 *
 * 불변식(양 구현 공통): 비밀번호는 argv·평문 디스크에 절대 노출 금지 — stdin/FIFO/DPAPI 암호문만.
 * 바이너리는 절대경로 고정(PATH 주입 방지).
 */
export interface PlatformAdapter {
  /** ssh/scp/ssh-keygen 절대경로 */
  ssh: string;
  scp: string;
  sshKeygen: string;

  /** OS 파일 매니저 선택 읽기(전송 폼 프리필) + 파일·폴더 혼합 대화상자 지원 — macOS true / Windows false */
  supportsFileSelection: boolean;
  /** UI 문구용 자격증명 저장소 이름 (예: "macOS Keychain") */
  credentialStoreName: string;
  /** 스크린샷 캡처 단축키 안내 (예: "⌃⇧⌘4") */
  captureHint: string;
  /** 파일 관리자 이름 (예: "Finder") — 안내 문구용 */
  fileManagerName: string;
  /** 키 설치 실패 시 터미널 수동 설치 안내 한 줄 */
  manualKeyInstallHint(user: string, hostName: string): string;
  /** 저장 PW 자동 삭제 실패 시 수동 제거 안내 한 줄 */
  credentialRemovalHint: string;

  /**
   * 자식 프로세스(ssh/scp 등)에 넘길 기본 env. Windows는 Raycast 런타임 env에
   * SystemRoot·USERPROFILE 등 핵심 변수가 빠져 있어 보정이 필수 — 없으면 ssh가
   * winsock 초기화 실패로 stderr 없이 exit 255 한다 (실측).
   */
  baseEnv(): NodeJS.ProcessEnv;

  /** 클립보드 이미지를 0700급 임시 디렉토리에 PNG로 추출해 경로 반환. 이미지 없으면 Error("NO_IMAGE") */
  extractClipboardPng(): Promise<string>;

  /**
   * 클립보드의 텍스트 (없으면 ""). 양 플랫폼 모두 Raycast API 대신 OS에서 직접 읽는다 —
   * macOS는 이미지 클립보드에 "Image (WxH)" 플레이스홀더를 돌려주고, Windows는 외부
   * 프로세스가 갓 복사한 텍스트를 놓치는 실측 이슈가 각각 있다 (어댑터 주석 참조).
   */
  readClipboardText(): Promise<string>;

  /**
   * 최전면 앱에서 블록 지정된 텍스트 (없으면 ""). 미지정·앱 미지원·접근성 권한 없음을
   * 구분하지 않고 전부 ""로 접는다 — 호출부는 "선택 텍스트를 쓸 수 있는가"만 알면 되고,
   * 못 쓰면 클립보드 경로로 조용히 넘어가야 하기 때문이다.
   */
  readSelectedText(): Promise<string>;

  /** alias 키로 PW 영구 저장 (Keychain / DPAPI blob) */
  savePassword(alias: string, password: string): Promise<void>;
  /** 저장 PW 삭제 — 항목 없음은 정상(멱등) */
  deletePassword(alias: string): Promise<void>;
  /** 전송용 env — ssh askpass가 alias의 저장 PW를 공급하도록 구성 */
  credentialEnv(alias: string): NodeJS.ProcessEnv;
  /** 1회용 PW를 askpass에 공급하는 스코프 — 종료 시 흔적을 반드시 제거 */
  withOneTimePassword<T>(
    password: string,
    fn: (env: NodeJS.ProcessEnv) => Promise<T>,
  ): Promise<T>;
  /** 공개키를 원격 authorized_keys에 설치. env는 withOneTimePassword가 만든 askpass env */
  installKey(
    pubKeyPath: string,
    user: string,
    hostName: string,
    port: string,
    env: NodeJS.ProcessEnv,
  ): Promise<void>;

  /** 파일 관리자에서 경로 선택 상태로 열기 (Finder 리보크/Explorer /select) */
  revealInFileManager(path: string): Promise<void>;
}

/** stderr 마지막 줄 — ssh 계열 에러 메시지 추출 공용 (system.ts·어댑터 공유) */
export function lastLine(s: string): string {
  const lines = s.trim().split("\n").filter(Boolean);
  return lines[lines.length - 1] ?? "";
}
