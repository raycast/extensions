import {
  Clipboard,
  LaunchProps,
  LaunchType,
  launchCommand,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { NoViewContext } from "./lib/launchContext";
import { isValidHost, validateRemotePath } from "./lib/validate";
import { addRecent, getAuthMode } from "./runtime/store";
import {
  confirmFolderPull,
  ensureKnownHost,
  prefs,
  revealInFinder,
  runPull,
} from "./runtime/system";

export default async function main(props: LaunchProps) {
  // 원격 경로는 클립보드에서 취득 (Send Clipboard Image가 전송 후 경로를 복사해 둠).
  // 비신뢰 입력 방어: 문자열 아니면 빈 문자열로 정규화 → validateRemotePath가 거른다
  const remotePath = ((await Clipboard.readText()) ?? "").trim();
  const pathError = validateRemotePath(remotePath);
  if (pathError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No remote path in clipboard",
      message: `Copy a remote path first (Send Clipboard Image copies it automatically). ${pathError}`,
    });
    return;
  }

  const ctx = props.launchContext as NoViewContext | undefined;
  const host = typeof ctx?.host === "string" ? ctx.host.trim() : "";
  if (!host) {
    // host 없음 → 셀렉터(pull 맥락, remotePath 동반)로 위임
    try {
      await launchCommand({
        name: "send-file-to-server",
        type: LaunchType.UserInitiated,
        context: { payload: "pull", remotePath },
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't open the server list",
        message: `Enable the Send File to Server command in Raycast. ${(e as Error).message}`,
      });
    }
    return;
  }

  if (!isValidHost(host)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid host",
      message: "Allowed: letters, digits, . _ - @",
    });
    return;
  }

  // 딥링크 host는 known 서버 목록에 있어야 pull — 조작된 딥링크로 임의 서버에 접속하는 것 차단
  if (!(await ensureKnownHost(host))) return;

  const mode = await getAuthMode(host);
  // 폴더면 재귀 다운로드 여부를 사용자 확인 — 취소 시 조용히 종료
  if (!(await confirmFolderPull(host, mode, remotePath))) return;

  try {
    const localPath = await runPull(
      host,
      mode,
      remotePath,
      prefs().downloadDir,
    );
    await Clipboard.copy(localPath);
    await addRecent(host);
    await revealInFinder(localPath);
    await showHUD(`✅ Pulled from ${host}`);
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Pull from ${host} failed`,
      message: `${remotePath} — ${(e as Error).message}`,
    });
  }
}
