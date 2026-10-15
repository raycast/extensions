import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Form,
  getSelectedFinderItems,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { createDeeplink, useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";
import { deleteServerFlow, ServerForm } from "./components/ServerForm";
import { parseSelectorContext, SelectorContext } from "./lib/launchContext";
import { HostEntry, mergeHosts } from "./lib/mergeHosts";
import { isValidHost, remoteBasename } from "./lib/validate";
import { addRecent, getAuthMode, getRecents } from "./runtime/store";
import { platform } from "./runtime/platform";
import {
  confirmFolderPull,
  confirmFolderSend,
  deliverPath,
  deliverPulledPath,
  ensureKnownHost,
  prefs,
  readAllHosts,
  runPull,
  runSend,
  runSendFiles,
} from "./runtime/system";

/**
 * 상단 제목 = 실제 실행된 Raycast 커맨드 이름과 일치 (package.json commands[].title).
 * 이 뷰는 여러 커맨드가 위임해 재사용하므로, payload로 원 커맨드를 되짚어 그 이름을 보여준다.
 */
const TITLES: Record<SelectorContext["payload"], string> = {
  finder: "Send File to Server",
  clipboard: "Send Clipboard Image",
  pull: "Pull File from Server",
  none: "Send File to Server",
};

function titleFor(ctx: SelectorContext): string {
  return TITLES[ctx.payload];
}

/**
 * 서버가 하나도 없을 때의 안내. "Hide ~/.ssh/config servers"가 기본 켜짐이라 config에 서버를
 * 가진 사용자도 빈 목록을 보게 된다 — 그 경우를 짚어주지 않으면 확장이 고장난 것처럼 읽힌다.
 */
const NO_SERVERS_HINT =
  'Add one in Manage Servers. If your servers are in ~/.ssh/config, turn off "Hide ~/.ssh/config servers" in preferences.';

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
  );
  // managed는 배열로 반환 — useCachedPromise가 결과를 JSON 직렬화 캐싱하므로 Set은 {}로 깨진다. Set 재구성은 렌더 시점.
  return { entries, managed };
}

interface ResolvedContext {
  ctx: SelectorContext;
  files: string[];
  /** 파일 전송 의도 — SendFilesForm(파일·폴더 picker 폼)으로 렌더 */
  needsPicker?: boolean;
}

/** macOS: Finder 선택을 폼 프리필로 읽는다(비활성·미선택이면 빈 배열). Windows: 선택 API 부재 — 항상 빈 배열 */
async function finderPrefill(): Promise<string[]> {
  if (!platform.supportsFileSelection) return [];
  try {
    return (await getSelectedFinderItems()).map((i) => i.path);
  } catch {
    return []; // Finder 비활성/frontmost 아님 — 빈 폼으로 시작
  }
}

/**
 * 실행 맥락 결정. clipboard/pull 위임은 서버 목록(List)으로, 파일 전송 의도(finder Quicklink·
 * 직접 실행·비정상 context)는 항상 SendFilesForm으로 보낸다 — "Finder에서 먼저 선택"이라는
 * 비가시 전제조건을 없애고, Finder 선택은 폼 프리필(가속기)로만 쓴다.
 */
async function resolveContext(raw: unknown): Promise<ResolvedContext> {
  // 위임 context는 payload 필드로만 식별 — 직접 실행(undefined)·빈 객체({})는 파일 전송 폼으로
  if (raw && typeof raw === "object" && "payload" in raw) {
    const ctx = parseSelectorContext(raw);
    if (ctx.payload === "clipboard" || ctx.payload === "pull")
      return { ctx, files: [] };
    // finder(host 고정 Quicklink 포함)·none(비정상 context 정규화 결과) — 파일 전송 폼으로
    return {
      ctx: ctx.payload === "finder" ? ctx : { payload: "finder" },
      files: await finderPrefill(),
      needsPicker: true,
    };
  }
  return {
    ctx: { payload: "finder" },
    files: await finderPrefill(),
    needsPicker: true,
  };
}

/**
 * 파일/폴더 배치 전송 코어 — 진행 toast·폴더 확인·결과 HUD 포함. 서버 목록(List)의 send()와
 * Windows 단일 폼이 공유한다. 자체적으로 에러를 toast로 처리하고 throw하지 않는다.
 */
async function performFileSend(host: string, files: string[]): Promise<void> {
  if (!isValidHost(host)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid host",
      message: "Allowed: letters, digits, . _ - @",
    });
    return;
  }
  // 선택에 폴더가 있으면 재귀 업로드 여부를 사용자 확인 — 취소 시 조용히 종료
  if (!(await confirmFolderSend(files, host))) return;
  const mode = await getAuthMode(host);
  let animated: Toast | undefined;
  try {
    animated = await showToast({
      style: Toast.Style.Animated,
      title: `Sending files to ${host}…`,
    });
    const progress = animated; // closure용 non-undefined 별칭
    const r = await runSendFiles(
      host,
      mode,
      files,
      prefs().remoteDir,
      (current, total, name) => {
        progress.title = `Sending ${current}/${total} to ${host}…`;
        progress.message = name;
      },
    );
    if (r.succeeded.length > 0) {
      await Clipboard.copy(r.succeeded.map((s) => s.remote).join("\n"));
      await addRecent(host);
    }
    await animated.hide();
    animated = undefined;
    const unit = r.folders > 0 ? "item" : "file"; // 폴더 포함 배치는 files 대신 items
    if (r.succeeded.length === 0) {
      const detail: string[] = [];
      // skip 사유(파일명 문자 등)를 함께 노출 — 알림만 보고 원인을 알 수 있게
      if (r.skipped.length)
        detail.push(`${r.skipped.length} skipped — ${r.skipped[0].reason}`);
      if (r.failed.length) detail.push(`${r.failed.length} failed`);
      await showToast({
        style: Toast.Style.Failure,
        title: `Nothing sent to ${host}`,
        message:
          detail.join(", ") ||
          "Nothing transferable in the selection — try again",
      });
    } else if (r.skipped.length === 0 && r.failed.length === 0) {
      await showHUD(`✅ Sent ${countOf(r.succeeded.length, unit)} to ${host}`);
    } else {
      const total = r.succeeded.length + r.skipped.length + r.failed.length;
      const detail = [
        r.skipped.length
          ? `${r.skipped.length} skipped — ${r.skipped[0].reason}`
          : "",
        r.failed.length ? `${r.failed.length} failed` : "",
      ]
        .filter(Boolean)
        .join(", ");
      await showHUD(
        `⚠️ Sent ${r.succeeded.length} of ${countOf(total, unit)} to ${host} (${detail})`,
      );
    }
  } catch (e) {
    if (animated) await animated.hide();
    await showToast({
      style: Toast.Style.Failure,
      title: `Send to ${host} failed`,
      message: (e as Error).message,
    });
  }
}

/**
 * 파일 전송 단일 폼 — 파일·폴더와 서버를 한 화면에서 고르고 제출 즉시 전송.
 * macOS는 혼합 선택 가능한 picker 1개에 Finder 선택이 프리필된다(있으면 Enter 한 번).
 * Windows는 대화상자 제약(파일·폴더 동시 선택 불가)으로 Folders·Files 2필드.
 * host 고정(Quicklink)이면 서버는 잠그고 파일만 고른다.
 */
function SendFilesForm(props: { targetHost?: string; initialFiles: string[] }) {
  const { data, isLoading } = useCachedPromise(loadHosts);
  const entries = data?.entries ?? [];
  const [fileError, setFileError] = useState<string | undefined>();
  // Quicklink 생성 액션용 — 드롭다운 값은 제출 전엔 폼 밖에서 못 읽으므로 onChange로 추적
  const [pickedHost, setPickedHost] = useState<string | undefined>();
  const noServers = !isLoading && !props.targetHost && entries.length === 0;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Send File to Server"
      actions={
        <ActionPanel>
          {!noServers && (
            <Action.SubmitForm
              title={
                props.targetHost
                  ? `Send to ${props.targetHost}`
                  : "Send to Server"
              }
              icon={Icon.Upload}
              onSubmit={async (values: {
                files?: string[];
                folders?: string[];
                host?: string;
              }) => {
                // macOS는 혼합 picker 1필드(files), Windows는 대화상자 제약으로 2필드 — 합쳐 전송
                const picked = [
                  ...(values.files ?? []),
                  ...(values.folders ?? []),
                ];
                if (picked.length === 0) {
                  setFileError("Pick at least one file or folder");
                  return;
                }
                setFileError(undefined);
                const host = props.targetHost ?? values.host;
                if (!host) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Pick a server",
                  });
                  return;
                }
                // Quicklink 유입 host는 known 서버 관문 통과 필수 (직접 선택은 목록이 이미 known)
                if (props.targetHost && !(await ensureKnownHost(host))) return;
                await performFileSend(host, picked);
                await popToRoot();
              }}
            />
          )}
          {/* 서버 고정 Quicklink 생성 — 구 서버 목록 화면의 액션을 폼으로 이관 */}
          {!noServers && !props.targetHost && pickedHost && (
            <Action.CreateQuicklink
              title="Create Quicklink to This Server"
              icon={Icon.Link}
              quicklink={quicklinkFor("finder", pickedHost)}
            />
          )}
        </ActionPanel>
      }
    >
      {noServers ? (
        <Form.Description title="No servers yet" text={NO_SERVERS_HINT} />
      ) : (
        <>
          {platform.supportsFileSelection ? (
            // macOS: 파일·폴더 혼합 선택 가능한 단일 picker — Finder 선택은 프리필(가속기)로만
            <Form.FilePicker
              id="files"
              title="Files & Folders"
              allowMultipleSelection
              canChooseDirectories
              canChooseFiles
              defaultValue={props.initialFiles}
              info="Pre-filled from your Finder selection."
              error={fileError}
            />
          ) : (
            <>
              {/* Windows 대화상자는 파일·폴더 동시 선택 불가 — 폴더/파일 별도 필드 (제출 시 합쳐 전송) */}
              <Form.FilePicker
                id="folders"
                title="Folders"
                allowMultipleSelection
                canChooseDirectories
                canChooseFiles={false}
                error={fileError}
              />
              <Form.FilePicker
                id="files"
                title="Files"
                allowMultipleSelection
                canChooseDirectories={false}
                canChooseFiles
              />
              <Form.Description
                title=""
                text="Windows can't pick files and folders in one dialog — both fields are sent together."
              />
            </>
          )}
          {props.targetHost ? (
            <Form.Description title="Server" text={props.targetHost} />
          ) : (
            <Form.Dropdown
              id="host"
              title="Server"
              storeValue
              onChange={setPickedHost}
            >
              {entries.map((e) => (
                <Form.Dropdown.Item
                  key={e.name}
                  value={e.name}
                  title={e.name}
                  icon={e.source === "config" ? Icon.Globe : Icon.HardDrive}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}
    </Form>
  );
}

export default function SendFileToServer(props: LaunchProps) {
  // resolveContext는 launchContext·Finder 선택(실행별 일회성 OS 상태)을 읽는다 — 절대 캐싱하지 않는다.
  // useCachedPromise는 LocalStorage에 영구 캐싱하므로 이전 실행의 파일 목록이 오전송될 수 있다.
  const { data: resolved, isLoading: ctxLoading } = usePromise(resolveContext, [
    props.launchContext,
  ]);
  const ctx = resolved?.ctx ?? { payload: "none" as const };
  const files = resolved?.files ?? [];
  const needsPicker = resolved?.needsPicker ?? false;

  const { data, isLoading, revalidate } = useCachedPromise(loadHosts);
  const entries = data?.entries ?? [];
  const managedSet = new Set(data?.managed ?? []);

  // 관리 서버 삭제 — config 블록 제거(선행 게이트) 후 Keychain PW·LocalStorage 정리(best-effort). 서버측 설치 키는 남는다.
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
    let animated: Toast | undefined; // 진행 toast — throw 시 catch에서 정리하도록 스코프 승격
    try {
      if (ctx.payload === "clipboard") {
        animated = await showToast({
          style: Toast.Style.Animated,
          title: `Sending clipboard to ${host}…`,
        });
        const { remotePath } = await runSend(host, mode, prefs().remoteDir);
        // 전송은 끝났다 — 부가 처리 실패가 경로 전달을 막거나 전송 실패로 보고되면 안 된다
        await addRecent(host).catch(() => undefined);
        await animated.hide().catch(() => undefined);
        animated = undefined;
        const delivered = await deliverPath(remotePath);
        await showHUD(`✅ Sent to ${host}${delivered}`);
      } else if (ctx.payload === "pull" && ctx.remotePath) {
        // 폴더면 재귀 다운로드 여부를 사용자 확인 — 취소 시 목록으로 복귀
        if (!(await confirmFolderPull(host, mode, ctx.remotePath))) return;
        // 대용량 폴더 pull이 무응답·오류로 보이지 않도록 완료까지 진행 toast 유지
        animated = await showToast({
          style: Toast.Style.Animated,
          title: `Pulling from ${host}…`,
          message: remoteBasename(ctx.remotePath),
        });
        const localPath = await runPull(
          host,
          mode,
          ctx.remotePath,
          prefs().downloadDir,
        );
        // 다운로드는 끝났다 — 부가 처리 실패가 pull 실패로 보고되면 안 된다
        await addRecent(host).catch(() => undefined);
        await animated.hide().catch(() => undefined);
        animated = undefined;
        const delivered = await deliverPulledPath(localPath);
        await showHUD(`✅ Pulled from ${host}${delivered}`);
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
            ? `No image in clipboard anymore — capture with ${platform.captureHint} and retry`
            : msg,
      });
    }
  }

  // 맥락 판별 전에는 빈 로딩 화면 — 폼/목록 어느 쪽인지 정해지기 전 서버 목록 오노출 방지
  if (ctxLoading) return <List isLoading={true} />;

  // 파일 전송은 단일 폼(파일·폴더 picker + 서버 + 즉시 전송) — macOS는 Finder 선택 프리필.
  // host 고정(Quicklink)이면 그 서버로 잠근다.
  if (needsPicker)
    return (
      <SendFilesForm
        targetHost={ctx.payload === "finder" ? ctx.host : undefined}
        initialFiles={files}
      />
    );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={titleFor(ctx)}
      searchBarPlaceholder="Search servers…"
    >
      {/* 서버가 0개일 때만 — 검색으로 걸러진 경우엔 Raycast 기본 문구가 맞다.
          로딩 중 빈 배열에 반응해 "없음"이 깜빡이지 않도록 !isLoading을 함께 본다 (폼 쪽 noServers와 동일) */}
      {!isLoading && entries.length === 0 && (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No servers yet"
          description={NO_SERVERS_HINT}
        />
      )}
      {entries.map((entry) => {
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
                  title={
                    ctx.payload === "pull"
                      ? "Pull from Server"
                      : "Send to Server"
                  }
                  icon={ctx.payload === "pull" ? Icon.Download : Icon.Upload}
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
                      onAction={() => deleteServerFlow(entry.name, revalidate)}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
