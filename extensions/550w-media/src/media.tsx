import {
  Action,
  ActionPanel,
  Form,
  Detail,
  OAuth,
  LocalStorage,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { open } from "node:fs/promises";
import path from "node:path";
import { token, rectangle, publicUrl } from "./generated/api.mjs";
import { request } from "./transport.mjs";
import { createSession, oauthDiagnostic } from "./oauth.mjs";
import { taskQuery, refreshTaskResult } from "./task-query.mjs";
import { resultSummary } from "./result-summary.mjs";
import { videoRegion } from "./video-region.mjs";
import { region, links } from "./region.mjs";
type Values = {
  action: string;
  files: string[];
  shareText: string;
  operationId: string;
  taskId: string;
  rectangle: string;
  confirmCharge: boolean;
};
const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName:
    region === "cn" ? "550W AI去字幕去水印" : "550W Watermark & Text Eraser",
  providerId: `550w-${region}`,
  providerIcon: "icon.png",
});
const session = createSession({
  client: oauthClient,
  storage: LocalStorage,
  region,
});
type Auth = {
  mode: string;
  apiKey?: string;
  userNo?: string;
  region?: string;
  session?: typeof session;
};
function TaskResult({
  initial,
  query: initialQuery,
  auth,
  cn,
  home,
  action,
  operation,
  uncertain = false,
}: {
  initial: unknown;
  query: ReturnType<typeof taskQuery>;
  auth: Auth;
  cn: boolean;
  home: string;
  action: string;
  operation?: string;
  uncertain?: boolean;
}) {
  const [result, setResult] = useState(initial),
    [query, setQuery] = useState(initialQuery),
    [loading, setLoading] = useState(false);
  const pending = useRef(false);
  async function refresh() {
    if ((!query && !(operation && auth.mode === "oauth")) || pending.current)
      return;
    pending.current = true;
    setLoading(true);
    try {
      const next = await refreshTaskResult(
        action,
        query,
        operation,
        auth,
        request,
      );
      setResult(next.result);
      setQuery(next.query);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: cn ? "查询失败；可再次查询" : "Query Failed; Try Again",
      });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }
  const summary = resultSummary(
    action === "receipt_query" && query
      ? query.endpoint === "imageWatermarkTaskDetail"
        ? "image"
        : "video"
      : action === "receipt_query" &&
          result &&
          typeof result === "object" &&
          "kind" in result
        ? String(result.kind)
        : action,
    result,
    query?.taskId,
  );
  const labels: Record<string, string> = cn
    ? {
        waiting: "已受理，等待处理",
        preparing: "准备中",
        processing: "处理中",
        security_checking: "安全检查中",
        success: "已完成",
        failed: "处理失败",
        rejected: "请求被拒绝",
        expired: "结果已过期",
        unknown: "状态未确认",
      }
    : {
        waiting: "Accepted — Waiting",
        preparing: "Preparing",
        processing: "Processing",
        security_checking: "Checking",
        success: "Completed",
        failed: "Processing Failed",
        rejected: "Request Rejected",
        expired: "Result Expired",
        unknown: "Status Unconfirmed",
      };
  const status = labels[summary.status] ?? labels.unknown;
  const guidance =
    uncertain && auth.mode === "api-key"
      ? cn
        ? "提交结果未确认。保留操作 ID，到网站任务记录核查，或联系支持。取得任务 ID 后使用图片/视频任务查询。不要换操作 ID 重新提交；API Key 接口不提供按操作 ID 查询回执。"
        : "Submission outcome is unconfirmed. Keep the operation ID and check your task history on the website or contact support. Once you have a task ID, use Image Task or Video Task. Do not resubmit with a new ID; the API Key API has no operation receipt lookup."
      : summary.url
        ? cn
          ? "结果已就绪。使用“打开结果”查看或下载；打开链接不代表文件已保存。"
          : "Your result is ready. Open it to view or download; opening a link does not confirm a saved file."
        : summary.status === "success"
          ? cn
            ? "处理已完成，但没有可用的结果链接。可再次查询或到网站查看。"
            : "Processing completed, but no valid result link is available. Check again or visit the website."
          : summary.failure
            ? cn
              ? "请查看失败说明，再决定下一步。"
              : "Review the failure details before continuing."
            : summary.status === "expired"
              ? cn
                ? "结果已过期，请到网站查看。"
                : "The result has expired. Visit the website for details."
              : cn
                ? "受理不等于完成。可手动查询状态，不会重新提交任务。"
                : "Acceptance is not completion. Check status manually without resubmitting.";
  return (
    <Detail
      isLoading={loading}
      markdown={"# " + status + "\n\n" + guidance}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={cn ? "状态" : "Status"} text={status} />
          {summary.taskId && (
            <Detail.Metadata.Label
              title={cn ? "任务 ID" : "Task ID"}
              text={summary.taskId}
            />
          )}
          {summary.failure && (
            <Detail.Metadata.Label
              title={cn ? "失败说明" : "Failure Details"}
              text={summary.failure}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {summary.url && (
            <Action.OpenInBrowser
              title={cn ? "打开结果" : "Open Result"}
              url={summary.url}
            />
          )}
          {(query || (operation && auth.mode === "oauth")) && (
            <Action
              title={cn ? "查询任务状态" : "Check Task Status"}
              onAction={refresh}
            />
          )}
          {summary.taskId && (
            <Action.CopyToClipboard
              title={cn ? "复制任务 ID" : "Copy Task ID"}
              content={summary.taskId}
            />
          )}
          <Action.OpenInBrowser
            title={cn ? "网页处理" : "Web Processing"}
            url={home}
          />
          {operation && (
            <Action.CopyToClipboard
              title={cn ? "复制操作 ID" : "Copy Operation ID"}
              content={operation}
            />
          )}
          <ActionPanel.Section title={cn ? "高级" : "Advanced"}>
            <Action.CopyToClipboard
              title={cn ? "复制响应 JSON" : "Copy Response JSON"}
              content={JSON.stringify(result)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const cn = region === "cn",
    home = links.home;
  const [busy, setBusy] = useState(false),
    [id, setId] = useState<string>(randomUUID());
  const [action, setAction] = useState("image");
  const pending = useRef(false);
  const { push } = useNavigation();
  async function submit(values: Values) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    let requested = false;
    try {
      if (
        ["image", "video", "share"].includes(values.action) &&
        !values.confirmCharge
      )
        throw new Error(cn ? "请确认积分使用" : "Confirm credit usage");
      const auth: Auth =
        prefs.authMode === "api-key"
          ? { mode: "api-key", apiKey: prefs.apiKey, userNo: prefs.userNo }
          : { mode: "oauth", region, session };
      if (auth.mode === "api-key") {
        if (!auth.apiKey?.trim() || !auth.userNo?.trim())
          throw new Error(
            cn
              ? "请先配置 API Key 和 User No"
              : "Configure API Key and User No first",
          );
      } else {
        await session.accessToken(false);
      }
      let result;
      if (values.action === "image" || values.action === "video") {
        token(values.operationId, values.action === "image" ? 64 : 128);
        if (values.files.length !== 1)
          throw new Error(
            cn ? "请选择一个图片或视频文件" : "Select one media file",
          );
        const selected = values.files[0];
        if (
          !(
            values.action === "image"
              ? /\.(png|jpg|jpeg|webp)$/i
              : /\.(mp4|mov)$/i
          ).test(selected)
        )
          throw new Error(cn ? "不支持的文件格式" : "Unsupported file format");
        const handle = await open(selected, "r");
        let file;
        try {
          const metadata = await handle.stat();
          // This native UI deliberately caps buffered uploads at 200 MiB; larger videos use the website.
          if (
            !metadata.isFile() ||
            metadata.size < 1 ||
            metadata.size > (values.action === "image" ? 52428800 : 209715200)
          )
            throw new Error(
              (cn
                ? "文件为空、无效或超过上限。请使用网页："
                : "File empty, invalid or too large. Use ") + home,
            );
          const bytes = new Uint8Array(metadata.size);
          let offset = 0;
          while (offset < bytes.length) {
            const read = await handle.read(
              bytes,
              offset,
              bytes.length - offset,
            );
            if (!read.bytesRead)
              throw new Error(cn ? "文件读取不完整" : "Incomplete file");
            offset += read.bytesRead;
          }
          const after = await handle.stat();
          if (
            after.size !== metadata.size ||
            after.mtimeMs !== metadata.mtimeMs ||
            after.ctimeMs !== metadata.ctimeMs
          )
            throw new Error(
              cn ? "读取期间文件发生变化" : "File changed during upload",
            );
          file = new File([bytes], path.basename(selected));
        } finally {
          await handle.close();
        }
        if (values.action === "image") {
          requested = true;
          result = await request(
            "removeImageWatermark",
            auth,
            { operationId: values.operationId, sync: "false" },
            file,
          );
        } else if (auth.mode === "oauth") {
          if (values.rectangle?.trim())
            rectangle(
              values.rectangle,
              Number.MAX_SAFE_INTEGER,
              Number.MAX_SAFE_INTEGER,
            );
          requested = true;
          result = await request(
            "eraseVideo",
            auth,
            {
              operationId: token(values.operationId, 64),
              area: values.rectangle?.trim()
                ? JSON.parse(values.rectangle).join(",")
                : "0,0,0,0",
            },
            file,
          );
        } else {
          if (values.rectangle?.trim())
            rectangle(
              values.rectangle,
              Number.MAX_SAFE_INTEGER,
              Number.MAX_SAFE_INTEGER,
            );
          const uploaded = await request("uploadVideo", auth, {}, file);
          if (uploaded.code !== 200) result = uploaded;
          else {
            const { width, height, duration, videoUrl } = uploaded;
            if (
              ![width, height].every((v) => Number.isInteger(v) && v > 0) ||
              Math.max(width, height) > 1920 ||
              Math.min(width, height) > 1080 ||
              !Number.isFinite(duration) ||
              duration < 1 ||
              duration > 600
            )
              throw new Error("Unsupported video metadata");
            const parameters = {
              videoUrl: publicUrl(videoUrl),
              width,
              height,
              duration,
              idempotencyKey: values.operationId,
              ...videoRegion(values.rectangle, width, height),
            };
            requested = true;
            result = await request("submitTask", auth, parameters);
          }
        }
      } else if (values.action === "share") {
        const urls = values.shareText.match(/https?:\/\/[^\s]+/g);
        if (urls?.length !== 1)
          throw new Error(
            cn ? "请提供一个平台分享链接" : "Provide exactly one share URL",
          );
        const parameters = {
          operationId: token(values.operationId, 64),
          videoUrl: publicUrl(urls[0].replace(/[，。；;！!）)】\]]+$/, "")),
        };
        requested = true;
        result = await request("removeVideoWatermark", auth, parameters);
      } else if (values.action === "receipt_query") {
        requested = true;
        result = await request("receipt", auth, {
          operationId: token(values.taskId, 64),
        });
      } else {
        if (!values.taskId.trim() || values.taskId.length > 128)
          throw new Error(cn ? "请提供有效任务 ID" : "Task ID required");
        requested = true;
        result = await request(
          values.action === "image_query"
            ? "imageWatermarkTaskDetail"
            : "taskDetail",
          auth,
          { taskId: values.taskId.trim() },
        );
      }
      const query = taskQuery(values.action, result, values.taskId);
      push(
        <TaskResult
          initial={result}
          query={query}
          auth={auth}
          cn={cn}
          home={home}
          action={values.action}
          operation={
            auth.mode === "oauth" && !query
              ? values.action === "receipt_query"
                ? values.taskId
                : values.operationId
              : undefined
          }
        />,
      );
    } catch (error) {
      if (requested && ["image", "video", "share"].includes(values.action)) {
        const auth: Auth =
          prefs.authMode === "api-key"
            ? { mode: "api-key", apiKey: prefs.apiKey, userNo: prefs.userNo }
            : { mode: "oauth", region, session };
        push(
          <TaskResult
            initial={{ code: 200, status: "unknown" }}
            query={undefined}
            auth={auth}
            cn={cn}
            home={home}
            action={values.action}
            operation={values.operationId}
            uncertain
          />,
        );
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: requested
          ? cn
            ? "请求未确认；先查询任务再重试"
            : "Request Not Confirmed; Query Before Retrying"
          : cn
            ? "请检查输入"
            : "Check Input",
        message: requested
          ? home
          : error instanceof Error
            ? error.message
            : "Invalid input",
      });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function authorize(disconnect = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (disconnect) await session.disconnect();
      else await session.accessToken(true);
      await showToast({
        style: Toast.Style.Success,
        title: cn
          ? disconnect
            ? "已断开授权"
            : "授权成功"
          : disconnect
            ? "Disconnected"
            : "Connected",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: cn ? "授权操作未确认" : "Authorization Not Confirmed",
        message: oauthDiagnostic(error),
      });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={cn ? "提交" : "Submit"} onSubmit={submit} />
          {prefs.authMode !== "api-key" && (
            <>
              <Action
                title={cn ? "连接 550W 账户" : "Connect 550W Account"}
                onAction={() => authorize()}
              />
              <Action
                title={cn ? "断开授权" : "Disconnect Authorization"}
                onAction={() => authorize(true)}
              />
            </>
          )}
          {!busy && (
            <Action
              title={cn ? "新操作" : "New Operation"}
              onAction={() => {
                if (!pending.current) setId(randomUUID());
              }}
            />
          )}
          <Action.OpenInBrowser
            title={cn ? "API Key 管理" : "Manage API Keys"}
            url={links.key}
          />
          <Action.OpenInBrowser
            title={cn ? "积分充值" : "Credits"}
            url={links.purchase}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          (cn ? "550W AI去字幕去水印。" : "550W Watermark & Text Eraser. ") +
          (cn
            ? "支持 OAuth 或 API Key。OAuth 请先连接账户。图片上限50 MiB，视频200 MiB。默认全屏擦除；受理后手动查询。"
            : "OAuth or API Key. Connect first for OAuth. Images: 50 MiB. Videos: 200 MiB. Full-frame erase by default; check status manually.")
        }
      />
      <Form.Dropdown
        id="action"
        title={cn ? "功能" : "Action"}
        value={action}
        onChange={setAction}
      >
        {(cn
          ? ["图片擦除", "本地视频擦除", "分享链接解析", "图片任务", "视频任务"]
          : [
              "Image Erase",
              "Video Erase",
              "Resolve Share Link",
              "Image Task",
              "Video Task",
            ]
        ).map((title, i) => (
          <Form.Dropdown.Item
            key={title}
            value={["image", "video", "share", "image_query", "video_query"][i]}
            title={title}
          />
        ))}
        {prefs.authMode !== "api-key" && (
          <Form.Dropdown.Item
            value="receipt_query"
            title={cn ? "查询原操作回执" : "Recover Original Operation"}
          />
        )}
      </Form.Dropdown>
      {["image", "video"].includes(action) && (
        <Form.FilePicker
          id="files"
          title={cn ? "图片或视频" : "Image or Video"}
          allowMultipleSelection={false}
          canChooseDirectories={false}
        />
      )}
      {action === "share" && (
        <>
          <Form.Description
            text={
              cn
                ? "从抖音、快手、哔哩哔哩、微博等 App 或网站点击分享，复制视频或内容分享链接。"
                : "Use Share in TikTok or X to copy a video or content share link."
            }
          />
          <Form.TextArea
            id="shareText"
            title={cn ? "分享文案或链接" : "Share Text or URL"}
            placeholder="https://…"
          />
        </>
      )}
      {!action.endsWith("_query") && (
        <Form.TextField
          id="operationId"
          title={cn ? "操作 ID / 幂等键" : "Stable Operation ID"}
          value={id}
          onChange={(value) => {
            if (!pending.current) setId(value);
          }}
        />
      )}
      {action.endsWith("_query") && (
        <Form.TextField
          id="taskId"
          title={
            action === "receipt_query"
              ? cn
                ? "原操作 ID"
                : "Original Operation ID"
              : cn
                ? "任务 ID"
                : "Task ID"
          }
          placeholder={
            cn ? "提交使用的标识" : "ID used for the original submission"
          }
        />
      )}
      {action === "video" && (
        <Form.TextField
          id="rectangle"
          title={cn ? "可选区域" : "Optional Rectangle"}
          placeholder="[x1,y1,x2,y2]"
        />
      )}
      {!action.endsWith("_query") && (
        <Form.Checkbox
          id="confirmCharge"
          label={cn ? "确认使用积分" : "Approve Credit Usage"}
          defaultValue={false}
        />
      )}
    </Form>
  );
}
