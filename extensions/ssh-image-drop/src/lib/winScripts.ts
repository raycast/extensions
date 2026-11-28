/**
 * Windows 전용 헬퍼 스크립트 텍스트·빌더 (순수 — 실행은 runtime/platform/win32.ts).
 * 스크립트는 supportPath에 파일로 설치 후 `-File`로 실행한다 — `-Command` 문자열 조립이 만드는
 * 경로 escaping/주입 문제를 원천 제거하기 위함 (가변 인자는 전부 $args·env·stdin으로만 전달).
 *
 * 비밀번호 저장은 DPAPI(사용자 단위 암호화, ConvertFrom-SecureString) blob 파일 — macOS Keychain의
 * Windows 대응. 평문은 argv·디스크에 절대 남기지 않는다(stdin은 base64, 저장물은 암호문).
 */

/** 클립보드 이미지를 PNG로 저장 — $args[0] = 출력 경로. 이미지 없으면 exit 1 (NO_IMAGE 신호) */
export const CLIPBOARD_PNG_PS = `$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms | Out-Null
Add-Type -AssemblyName System.Drawing | Out-Null
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -eq $img) { exit 1 }
$img.Save($args[0], [System.Drawing.Imaging.ImageFormat]::Png)
`;

/**
 * 클립보드 텍스트를 UTF-8 바이트로 stdout에 쓴다 — 텍스트 없으면 빈 출력.
 * Raycast Windows의 Clipboard.readText()가 외부에서 갓 복사된 텍스트를 놓치는(빈 값) 실측 이슈의
 * 우회 — 이미지 추출(CLIPBOARD_PNG_PS)과 동일하게 시스템 클립보드를 직접 읽는다.
 * (Write-Output은 콘솔 codepage를 타서 비ASCII 경로가 깨진다 — askpass와 같은 raw 스트림 출력)
 */
export const CLIPBOARD_TEXT_PS = `$ErrorActionPreference = "Stop"
$t = Get-Clipboard -Raw
if ($null -eq $t) { exit 0 }
$bytes = [System.Text.Encoding]::UTF8.GetBytes($t)
$out = [Console]::OpenStandardOutput()
$out.Write($bytes, 0, $bytes.Length)
$out.Flush()
`;

/**
 * DPAPI 저장 — stdin으로 base64(UTF-8) PW를 받아 사용자 단위 암호문을 $args[0]에 기록.
 * base64 경유 이유: PowerShell 콘솔 stdin은 시스템 codepage로 디코드되어 비ASCII PW가 깨질 수 있다.
 * 원자 쓰기: Set-Content는 truncate-후-쓰기라 갱신 중 크래시 시 기존 blob이 잘린 채 남는다 —
 * .tmp에 완성 후 Move-Item(동일 볼륨 rename)으로 교체해 config 쓰기와 동일한 원자성 불변식 유지.
 */
export const DPAPI_SAVE_PS = `$ErrorActionPreference = "Stop"
$b64 = [Console]::In.ReadToEnd().Trim()
$plain = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
$ss = ConvertTo-SecureString -String $plain -AsPlainText -Force
$tmp = $args[0] + ".tmp"
ConvertFrom-SecureString -SecureString $ss | Set-Content -LiteralPath $tmp -Encoding ASCII
Move-Item -LiteralPath $tmp -Destination $args[0] -Force
`;

/**
 * askpass 본체 — SSH_IMAGE_DROP_CRED가 가리키는 DPAPI blob을 복호해 UTF-8 바이트로 stdout에 쓴다.
 * (Write-Output은 콘솔 인코딩을 타서 비ASCII가 깨진다 — raw 스트림 출력 필수)
 * 영구 저장·1회용 모두 이 단일 경로를 쓴다 — Mac의 FIFO/Keychain 이원 구조를 blob 파일 하나로 통일.
 */
export const ASKPASS_PS1 = `$ErrorActionPreference = "Stop"
$f = $env:SSH_IMAGE_DROP_CRED
if (-not $f -or -not (Test-Path -LiteralPath $f)) { exit 1 }
$ss = (Get-Content -LiteralPath $f -Raw).Trim() | ConvertTo-SecureString
$b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ss)
try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
$bytes = [System.Text.Encoding]::UTF8.GetBytes($plain)
$out = [Console]::OpenStandardOutput()
$out.Write($bytes, 0, $bytes.Length)
$out.Flush()
`;

/**
 * ssh가 직접 실행하는 askpass 진입점 — 같은 폴더의 askpass.ps1에 위임.
 * Windows OpenSSH는 .bat를 askpass로 직접 실행 가능(실측). powershell은 절대경로(주입 방지).
 */
export const ASKPASS_BAT = `@echo off
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0askpass.ps1"
`;

/**
 * alias → DPAPI blob 파일명. encodeURIComponent로 파일시스템 예약문자를 제거하고
 * "cred-" 접두로 Windows 예약 장치명(CON·NUL 등)과의 충돌을 차단한다. 역변환 불필요(조회는 항상 alias 기준).
 */
export function credBlobFileName(alias: string): string {
  return `cred-${encodeURIComponent(alias)}.dpapi`;
}

/** PW → stdin 전송용 base64(UTF-8). 순수 함수로 분리해 인코딩 규약을 테스트로 고정한다. */
export function toBase64Utf8(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}
