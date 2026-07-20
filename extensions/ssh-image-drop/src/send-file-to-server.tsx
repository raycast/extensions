import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  getSelectedFinderItems,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { createDeeplink, useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { ServerForm } from "./components/ServerForm";
import { parseSelectorContext, SelectorContext } from "./lib/launchContext";
import { HostEntry, mergeHosts, parseAdditionalHosts } from "./lib/mergeHosts";
import { removeManagedBlock } from "./lib/sshConfigText";
import { isValidHost, remoteBasename } from "./lib/validate";
import {
  addRecent,
  forgetHost,
  getAuthMode,
  getRecents,
} from "./runtime/store";
import {
  confirmFolderPull,
  confirmFolderSend,
  deleteKeychainPassword,
  ensureKnownHost,
  prefs,
  readAllHosts,
  readManagedConfig,
  runPull,
  runSend,
  runSendFiles,
  revealInFinder,
  writeManagedConfig,
} from "./runtime/system";

const TITLES: Record<SelectorContext["payload"], string> = {
  finder: "Send Files to…",
  clipboard: "Send Clipboard to…",
  pull: "Pull from…",
  none: "SSH Image Drop",
};

/** pull은 basename을 제목에 노출(설계 §4.1: "Pull *basename* from…") */
function titleFor(ctx: SelectorContext): string {
  if (ctx.payload === "pull" && ctx.remotePath)
    return `Pull ${remoteBasename(ctx.remotePath)} from…`;
  return TITLES[ctx.payload];
}

/**
 * 서버를 박은 원클릭 Quicklink 정의. host는 딥링크 context로 전달되고
 * 소비 측이 isValidHost + ensureKnownHost로 재검증한다.
 * finder는 서버만 고정 — 파일은 실행 시점 Finder 선택으로 읽는다.
 */
function quicklinkFor(payload: "finder" | "clipboard" | "pull", host: string) {
  if (payload === "pull") {
    return {
      name: `Pull from ${host}`,
      link: createDeeplink({ command: "pull-file", context: { host } }),
    };
  }
  if (payload === "finder") {
    return {
      name: `Send Files to ${host}`,
      link: createDeeplink({
        command: "send-file-to-server",
        context: { payload: "finder", host },
      }),
    };
  }
  return {
    name: `Send Clipboard to ${host}`,
    link: createDeeplink({
      command: "send-clipboard-image",
      context: { host },
    }),
  };
}

/** "1 file" / "3 files" / 폴더 포함 배치는 "2 items" — 결과 HUD 문장용 */
function countOf(n: number, unit: "file" | "item"): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

async function loadHosts(): Promise<{
  entries: HostEntry[];
  managed: string[];
}> {
  const { managed, config } = readAllHosts();
  const p = prefs();
  const entries = mergeHosts(
    await getRecents(),
    managed,
    // 설정 시 ~/.ssh/config 호스트 숨김 — managed·recent만 목록에 (config 파일 자체는 불변)
    p.hideConfigHosts ? [] : config,
    parseAdditionalHosts(p.additionalHosts),
  );
  // managed는 배열로 반환 — useCachedPromise가 결과를 JSON 직렬화 캐싱하므로 Set은 {}로 깨진다. Set 재구성은 렌더 시점.
  return { entries, managed };
}

/** 직접 실행(launchContext 부재) 시 Finder 선택으로 맥락 결정. 선택 없음 → payload "none"(사용법 안내 화면) */
async function resolveContext(
  raw: unknown,
): Promise<{ ctx: SelectorContext; files: string[] }> {
  // 위임 context는 payload 필드로만 식별 — 직접 실행(undefined)·빈 객체({})는 Finder 탐색 경로로
  if (raw && typeof raw === "object" && "payload" in raw) {
    const ctx = parseSelectorContext(raw);
    if (ctx.payload !== "finder") return { ctx, files: [] };
    // finder Quicklink(host 고정 딥링크) — 파일은 실행 시점 Finder 선택에서 읽는다
    try {
      const items = await getSelectedFinderItems();
      const files = items.map((i) => i.path);
      if (files.length > 0) return { ctx, files };
    } catch {
      // Finder 비활성/frontmost 아님 — 아래 none 폴백
    }
    return { ctx: { payload: "none" }, files: [] };
  }
  try {
    const items = await getSelectedFinderItems();
    const files = items.map((i) => i.path);
    return files.length > 0
      ? { ctx: { payload: "finder" }, files }
      : { ctx: { payload: "none" }, files: [] };
  } catch {
    // Finder 비활성/frontmost 아님 → reject → 전송 대상 없음(안내 화면)
    return { ctx: { payload: "none" }, files: [] };
  }
}

export default function SendFileToServer(props: LaunchProps) {
  // resolveContext는 launchContext·Finder 선택(실행별 일회성 OS 상태)을 읽는다 — 절대 캐싱하지 않는다.
  // useCachedPromise는 LocalStorage에 영구 캐싱하므로 이전 실행의 파일 목록이 오전송될 수 있다.
  const { data: resolved, isLoading: ctxLoading } = usePromise(resolveContext, [
    props.launchContext,
  ]);
  const ctx = resolved?.ctx ?? { payload: "none" as const };
  const files = resolved?.files ?? [];

  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate } = useCachedPromise(loadHosts);
  const entries = data?.entries ?? [];
  const managedSet = new Set(data?.managed ?? []);

  // 관리 서버 삭제 — config 블록 제거(선행 게이트) 후 Keychain PW·LocalStorage 정리(best-effort). 서버측 설치 키는 남는다.
  async function deleteServer(alias: string) {
    const confirmed = await confirmAlert({
      title: `Delete ${alias}?`,
      icon: Icon.Trash,
      message:
        "Removes it from ~/.ssh/ssh_image_drop_config and deletes its saved Keychain password. A public key already installed on the server is NOT removed.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    // 실패 가능성이 가장 큰 config 쓰기를 선행 게이트로 — 실패 시 아무것도 바꾸지 않고 중단(재시도 가능).
    try {
      writeManagedConfig(removeManagedBlock(readManagedConfig(), alias));
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Couldn't delete ${alias}`,
        message: (e as Error).message,
      });
      return;
    }
    // config 제거 성공 — 서버는 이미 삭제됨. 이후 정리는 best-effort이되 Keychain 실패는 삼키지 않고 고지.
    // authMode와 무관하게 무조건 시도(항목 없음 exit 44는 내부에서 성공 처리) — authMode 유실 시 credential 잔존 방지.
    let keychainError: string | null = null;
    try {
      await deleteKeychainPassword(alias);
    } catch (e) {
      keychainError = (e as Error).message;
    }
    await forgetHost(alias).catch(() => undefined);
    revalidate();
    if (keychainError) {
      // config·목록에서는 사라졌지만 PW가 남음 — 성공으로 오인시키지 않고 수동 제거 안내
      await showToast({
        style: Toast.Style.Failure,
        title: `Deleted ${alias}, but its Keychain password remains`,
        message: `Remove it in Keychain Access (service "ssh-image-drop"). ${keychainError}`,
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: `Deleted ${alias}`,
      });
    }
  }

  // finder Quicklink(host 고정) — 파일이 있으면 셀렉터 없이 그 서버로 바로 전송(원클릭).
  // 딥링크 유입 host이므로 known 서버 검증을 통과해야 하며, 실패 시 목록 화면으로 폴백한다.
  const autoSent = useRef(false);
  useEffect(() => {
    const host = ctx.payload === "finder" ? ctx.host : undefined;
    if (!host || files.length === 0 || autoSent.current) return;
    autoSent.current = true; // 재렌더로 인한 중복 전송 방지
    void (async () => {
      if (await ensureKnownHost(host)) await send(host);
    })();
  }, [ctx, files]);

  async function send(host: string) {
    if (!isValidHost(host)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid host",
        message: "Allowed: letters, digits, . _ - @",
      });
      return;
    }
    const mode = await getAuthMode(host);
    let animated: Toast | undefined; // finder 진행 toast — throw 시 catch에서 정리하도록 스코프 승격
    try {
      if (ctx.payload === "clipboard") {
        const { remotePath } = await runSend(host, mode, prefs().remoteDir);
        await Clipboard.copy(remotePath);
        await addRecent(host);
        await showHUD(`✅ Sent to ${host}`);
      } else if (ctx.payload === "pull" && ctx.remotePath) {
        // 폴더면 재귀 다운로드 여부를 사용자 확인 — 취소 시 목록으로 복귀
        if (!(await confirmFolderPull(host, mode, ctx.remotePath))) return;
        const localPath = await runPull(
          host,
          mode,
          ctx.remotePath,
          prefs().downloadDir,
        );
        await Clipboard.copy(localPath);
        await addRecent(host);
        await revealInFinder(localPath);
        await showHUD(`✅ Pulled from ${host}`);
      } else if (ctx.payload === "finder") {
        // 선택에 폴더가 있으면 재귀 업로드 여부를 사용자 확인 — 취소 시 목록으로 복귀
        if (!(await confirmFolderSend(files, host))) return;
        animated = await showToast({
          style: Toast.Style.Animated,
          title: `Sending files to ${host}…`,
        });
        const r = await runSendFiles(host, mode, files, prefs().remoteDir);
        if (r.succeeded.length > 0) {
          await Clipboard.copy(r.succeeded.map((s) => s.remote).join("\n"));
          await addRecent(host);
        }
        await animated.hide();
        animated = undefined;
        // 결과는 문장형 한 줄 — "Sent 3 files to prod-web" (경로는 클립보드에 있음)
        const unit = r.folders > 0 ? "item" : "file"; // 폴더 포함 배치는 files 대신 items
        if (r.succeeded.length === 0) {
          const detail: string[] = [];
          if (r.skipped.length) detail.push(`${r.skipped.length} skipped`);
          if (r.failed.length) detail.push(`${r.failed.length} failed`);
          // 유효 항목 0개·전량 실패 — HUD 대신 Failure toast(빨강)
          await showToast({
            style: Toast.Style.Failure,
            title: `Nothing sent to ${host}`,
            message:
              detail.join(", ") ||
              "Nothing transferable in the selection — try again",
          });
        } else if (r.skipped.length === 0 && r.failed.length === 0) {
          await showHUD(
            `✅ Sent ${countOf(r.succeeded.length, unit)} to ${host}`,
          );
        } else {
          const total = r.succeeded.length + r.skipped.length + r.failed.length;
          const detail = [
            r.skipped.length ? `${r.skipped.length} skipped` : "",
            r.failed.length ? `${r.failed.length} failed` : "",
          ]
            .filter(Boolean)
            .join(", ");
          await showHUD(
            `⚠️ Sent ${r.succeeded.length} of ${countOf(total, unit)} to ${host} (${detail})`,
          );
        }
      }
    } catch (e) {
      if (animated) await animated.hide(); // finder 진행 toast가 떠 있으면 정리 (스코프 누수 방지)
      const msg = (e as Error).message;
      // clipboard 위임 후 목록 탐색 중 clipboard가 바뀌면 runSend가 NO_IMAGE throw (TOCTOU) — 원문 대신 친화 메시지
      await showToast({
        style: Toast.Style.Failure,
        // 공용 catch — pull은 "Pull from", 나머지는 "Send to"
        title: `${ctx.payload === "pull" ? "Pull from" : "Send to"} ${host} failed`,
        message:
          msg === "NO_IMAGE"
            ? "No image in clipboard anymore — capture with ⌃⇧⌘4 and retry"
            : msg,
      });
    }
  }

  return (
    <List
      filtering={ctx.payload !== "none"}
      isLoading={isLoading || ctxLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle={titleFor(ctx)}
      searchBarPlaceholder="Search servers…"
    >
      {ctx.payload === "none" ? (
        // 전송 대상 없음(직접 실행 + Finder 미선택) → 서버 목록 대신 사용법 안내
        <List.EmptyView
          icon={Icon.Finder}
          title="Select files or folders in Finder first"
          description={
            "Select files or folders in Finder, then run this command to send them over SSH. " +
            "For a clipboard image, use the “Send Clipboard Image” command. " +
            "To pin a one-click Quicklink for a server, pick it in any transfer command and press ⌘K → Create Quicklink."
          }
        />
      ) : (
        entries.map((entry) => {
          const isManaged = managedSet.has(entry.name);
          return (
            <List.Item
              key={`${entry.source}:${entry.name}`}
              title={entry.name}
              icon={isManaged ? Icon.HardDrive : Icon.Globe}
              accessories={
                isManaged
                  ? [{ tag: { value: "managed", color: Color.Blue } }]
                  : []
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Send"
                    icon={Icon.Upload}
                    onAction={() => send(entry.name)}
                  />
                  {/* 서버 고정 Quicklink 생성 — finder는 서버만 고정(파일은 실행 시점 Finder 선택) */}
                  {ctx.payload !== "none" && (
                    <Action.CreateQuicklink
                      title="Create Quicklink to This Server"
                      icon={Icon.Link}
                      quicklink={quicklinkFor(ctx.payload, entry.name)}
                    />
                  )}
                  {/* Edit/Delete는 우리가 만든 관리 서버에만 — ~/.ssh/config·recents는 손대지 않음 */}
                  {isManaged && (
                    <ActionPanel.Section>
                      <Action.Push
                        title="Edit Server"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        target={
                          <ServerForm
                            mode={{
                              kind: "edit",
                              alias: entry.name,
                              onDone: revalidate,
                            }}
                          />
                        }
                      />
                      <Action
                        title="Delete Server"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() => deleteServer(entry.name)}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
