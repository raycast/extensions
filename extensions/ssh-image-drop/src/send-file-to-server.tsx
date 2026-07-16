import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  getSelectedFinderItems,
  Icon,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { createDeeplink, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { parseSelectorContext, SelectorContext } from "./lib/launchContext";
import { HostEntry, mergeHosts, parseAdditionalHosts } from "./lib/mergeHosts";
import { isValidHost, remoteBasename } from "./lib/validate";
import { addRecent, getAuthMode, getRecents } from "./runtime/store";
import {
  prefs,
  readAllHosts,
  runPull,
  runSend,
  runSendFiles,
  revealInFinder,
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
 * clipboard/pull 맥락에서 서버를 박은 원클릭 Quicklink 정의.
 * host는 딥링크 context로 전달되고 대상 커맨드가 isValidHost로 재검증한다.
 * finder는 파일을 런타임에 선택하므로 Quicklink 대상이 아니다(caller가 clipboard/pull만 호출).
 */
function quicklinkFor(payload: "clipboard" | "pull", host: string) {
  if (payload === "pull") {
    return {
      name: `Pull from ${host}`,
      link: createDeeplink({ command: "pull-file", context: { host } }),
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
    return { ctx: parseSelectorContext(raw), files: [] };
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
  const { data, isLoading } = useCachedPromise(loadHosts);
  const entries = data?.entries ?? [];
  const managedSet = new Set(data?.managed ?? []);

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
        const localPath = await runPull(
          host,
          mode,
          ctx.remotePath,
          prefs().downloadDir,
        );
        await addRecent(host);
        await revealInFinder(localPath);
        await showHUD(`✅ Pulled from ${host}`);
      } else if (ctx.payload === "finder") {
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
        // 성공/실패는 건수만 심플하게 (경로는 클립보드에 있음)
        const parts: string[] = [];
        if (r.succeeded.length) parts.push(`${r.succeeded.length} sent`);
        if (r.skipped.length) parts.push(`${r.skipped.length} skipped`);
        if (r.failed.length) parts.push(`${r.failed.length} failed`);
        if (r.succeeded.length === 0) {
          // 유효 파일 0개·전량 실패 — HUD 대신 Failure toast(빨강)
          await showToast({
            style: Toast.Style.Failure,
            title: `Nothing sent to ${host}`,
            message:
              parts.join(" · ") ||
              "Only files can be sent (folders and links are skipped)",
          });
        } else {
          await showHUD(
            `${r.failed.length ? "⚠️" : "✅"} ${parts.join(" · ")}`,
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
          title="Select files in Finder first"
          description={
            "Select files in Finder, then run this command to send them over SSH. " +
            "For a clipboard image, use the “Send Clipboard Image” command. " +
            "To pin a one-click Quicklink for a server, pick it in “Send Clipboard Image” or “Pull File from Server” and press ⌘K → Create Quicklink."
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
                  {/* clipboard/pull만 서버 고정 Quicklink 생성 — finder는 파일이 런타임 선택이라 제외 */}
                  {(ctx.payload === "clipboard" || ctx.payload === "pull") && (
                    <Action.CreateQuicklink
                      title="Create Quicklink to This Server"
                      icon={Icon.Link}
                      quicklink={quicklinkFor(ctx.payload, entry.name)}
                    />
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
