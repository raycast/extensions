import {
  LaunchProps,
  LaunchType,
  launchCommand,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { NoViewContext } from "./lib/launchContext";
import {
  isValidHost,
  remoteBasename,
  validateRemotePath,
} from "./lib/validate";
import { addRecent, getAuthMode } from "./runtime/store";
import {
  confirmFolderPull,
  deliverPulledPath,
  ensureKnownHost,
  prefs,
  readClipboardText,
  runPull,
} from "./runtime/system";

export default async function main(props: LaunchProps) {
  // 원격 경로는 클립보드에서 취득 — 읽기는 어댑터 경유 (Raycast Windows readText 이슈 우회)
  const remotePath = (await readClipboardText()).trim();
  const pathError = validateRemotePath(remotePath);
  if (pathError) {
    // 경로 형태인데 거부된 경우(파일명 문자 등)와 아예 경로가 아닌 경우를 구분해 알림
    const looksLikePath = /^(\/|~\/)/.test(remotePath);
    await showToast({
      style: Toast.Style.Failure,
      title: looksLikePath
        ? "Remote path can't be used"
        : "No remote path in clipboard",
      message: looksLikePath
        ? pathError
        : `This command downloads the file at the server path in your clipboard. ${pathError}`,
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

  // 대용량 폴더 pull이 무응답·오류로 보이지 않도록 완료까지 진행 toast 유지
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Pulling from ${host}…`,
    message: remoteBasename(remotePath),
  });
  let localPath: string;
  try {
    localPath = await runPull(host, mode, remotePath, prefs().downloadDir);
  } catch (e) {
    await toast.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: `Pull from ${host} failed`,
      message: `${remotePath} — ${(e as Error).message}`,
    });
    return;
  }

  // 다운로드는 끝났다 — 부가 처리 실패가 pull 실패로 보고되면 안 된다
  await addRecent(host).catch(() => undefined);
  await toast.hide().catch(() => undefined);
  const delivered = await deliverPulledPath(localPath);
  await showHUD(`✅ Pulled from ${host}${delivered}`);
}
