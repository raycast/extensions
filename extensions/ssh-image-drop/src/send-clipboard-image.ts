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
import { isValidHost } from "./lib/validate";
import { addRecent, getAuthMode } from "./runtime/store";
import {
  clipboardHasImage,
  ensureKnownHost,
  prefs,
  runSend,
} from "./runtime/system";

async function showNoImageToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "No image in clipboard",
    message:
      "Copy an image or press ⌃⇧⌘4 to capture one — copying a file in Finder isn't supported.",
  });
}

export default async function main(props: LaunchProps) {
  const ctx = props.launchContext as NoViewContext | undefined;
  // 비신뢰 입력(수동·오염 딥링크) 방어: 문자열이 아니면 host 없음으로 취급
  const host = typeof ctx?.host === "string" ? ctx.host.trim() : "";

  // 단축키(Quicklink) 아닌 직접 실행: host 없음 → 셀렉터로 위임. 단 이미지 없으면 먼저 종료.
  if (!host) {
    if (!(await clipboardHasImage())) {
      await showNoImageToast();
      return;
    }
    try {
      await launchCommand({
        name: "send-file-to-server",
        type: LaunchType.UserInitiated,
        context: { payload: "clipboard" },
      });
    } catch (e) {
      // 대상 커맨드가 비활성화되어 있으면 launchCommand가 throw
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

  // 딥링크 host는 known 서버 목록에 있어야 전송 — 조작된 딥링크로 임의 서버에 클립보드가 나가는 것 차단
  if (!(await ensureKnownHost(host))) return;

  // 전송이 무응답·오류로 보이지 않도록 완료까지 진행 toast 유지
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Sending clipboard to ${host}…`,
  });
  try {
    const { remotePath } = await runSend(
      host,
      await getAuthMode(host),
      prefs().remoteDir,
    );
    await Clipboard.copy(remotePath);
    await addRecent(host);
    await toast.hide();
    await showHUD(`✅ Sent to ${host}`);
  } catch (e) {
    await toast.hide();
    const msg = (e as Error).message;
    if (msg === "NO_IMAGE") {
      await showNoImageToast();
      return;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: `Send to ${host} failed`,
      message: msg,
    });
  }
}
