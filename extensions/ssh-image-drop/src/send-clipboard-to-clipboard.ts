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
  clipboardKindLabel,
  EMPTY_CLIPBOARD_HINT,
  isValidHost,
} from "./lib/validate";
import { addRecent, getAuthMode, putPendingSelection } from "./runtime/store";
import {
  captureClipboard,
  ClipboardSnapshot,
  ensureKnownHost,
  releaseClipboardSnapshot,
  runSyncClipboard,
} from "./runtime/system";

async function showNothingToSendToast() {
  await showToast({
    style: Toast.Style.Failure,
    title: "Nothing to send",
    message: EMPTY_CLIPBOARD_HINT,
  });
}

export default async function main(props: LaunchProps) {
  const ctx = props.launchContext as NoViewContext | undefined;
  // 비신뢰 입력(수동·오염 딥링크) 방어: 문자열이 아니면 host 없음으로 취급
  const host = typeof ctx?.host === "string" ? ctx.host.trim() : "";

  // 직접 실행(host 없음) → 셀렉터로 위임. 단 보낼 것이 없으면 서버를 고르게 하기 전에 끝낸다.
  if (!host) {
    let probe: ClipboardSnapshot | null = null;
    try {
      probe = await captureClipboard();
    } catch (e) {
      // 크기 초과 등 거부 사유는 여기서 끝난다 — 위임하지 않으므로 전송 경로가 대신
      // 진단해 주지 않는다. "보낼 것이 없다"로 접으면 사실과 다른 안내가 된다.
      await showToast({
        style: Toast.Style.Failure,
        title: "Can't send the clipboard",
        message: (e as Error).message,
      });
      return;
    }
    releaseClipboardSnapshot(probe); // 위임 전 임시 PNG 회수 (셀렉터가 다시 캡처한다)
    if (!probe) {
      await showNothingToSendToast();
      return;
    }
    // 선택 텍스트는 지금 잡은 것을 넘긴다 — 셀렉터가 뜨면 원래 앱의 선택이 풀려
    // 거기서 다시 읽으면 빈 값이 되고, 사용자가 지정한 블록 대신 클립보드가 전송된다.
    // 경로는 LocalStorage — launchContext는 비신뢰라 조작된 딥링크가 같은 payload로
    // 공격자 문자열을 "사용자가 지정한 텍스트"로 위장해 보낼 수 있다.
    // 항상 쓴다(선택이 아니면 빈 문자열) — 이전 실행의 stale 값이 남아 소비되는 것을 막는다.
    await putPendingSelection(
      probe.source === "selection" && probe.kind === "text" ? probe.text : "",
    ).catch(() => undefined);
    try {
      await launchCommand({
        name: "send-file-to-server",
        type: LaunchType.UserInitiated,
        context: { payload: "remote-clipboard" },
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

  let snap: ClipboardSnapshot | null = null;
  let toast: Toast | undefined;
  try {
    snap = await captureClipboard();
    if (!snap) {
      await showNothingToSendToast();
      return;
    }
    // 확인 알림은 두지 않는다. Quicklink를 만드는 행위 자체가 "이 서버로 보내겠다"는
    // 명시적 설정이고(셀렉터에서 서버를 고르는 것과 동등), 대상은 ensureKnownHost가
    // 이미 등록·최근 사용 서버로 좁혀 놨다. 파일 전송·pull Quicklink도 확인 없이 실행된다.
    // 무엇이 나갔는지는 진행 toast와 HUD의 출처 표기로 알린다.
    const label = clipboardKindLabel(snap.source, snap.bytes);

    toast = await showToast({
      style: Toast.Style.Animated,
      title: `Syncing clipboard to ${host}…`,
      message: label,
    });
    await runSyncClipboard(host, await getAuthMode(host), snap);
    // 주입은 끝났다 — 부가 처리 실패가 전송 실패로 보고되면 안 된다
    await addRecent(host).catch(() => undefined);
    await toast.hide().catch(() => undefined);
    toast = undefined;
    // 성공 알림 실패가 catch로 떨어져 "전송 실패"로 보고되면 안 된다 — 주입은 이미 끝났다
    await showHUD(`✅ ${label} → ${host}`).catch(() => undefined);
  } catch (e) {
    // hide 실패로 정작 실패 알림을 못 띄우면 실패가 조용히 묻힌다 — 성공 경로와 동일하게 best-effort
    if (toast) await toast.hide().catch(() => undefined);
    await showToast({
      style: Toast.Style.Failure,
      title: `Sync to ${host} failed`,
      message: (e as Error).message,
    });
  } finally {
    releaseClipboardSnapshot(snap); // 이미지 임시 PNG — 취소·실패 포함 모든 경로에서 회수
  }
}
