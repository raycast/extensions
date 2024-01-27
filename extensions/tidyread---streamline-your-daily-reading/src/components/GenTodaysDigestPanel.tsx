import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  Toast,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { Digest } from "../types";
import CustomActionPanel from "./CustomActionPanel";
import { useEffect, useState } from "react";
import { normalizePreference } from "../utils/preference";
import { bizGenDigest } from "../utils/biz";
import { NO_API_KEY, NO_FEEDS, matchError } from "../utils/error";
import DigestDetail from "./DigestDetail";
import dayjs from "dayjs";
import { pick } from "lodash";
import { formatSeconds } from "../utils/util";

const navTitleMap = {
  generating: "Generating Digest",
  success: "Digest Generated  🎉",
  failed: "Digest Generation Failed  😩",
};

const translateStatusMap = {
  "no-config":
    "no <Preferred Language> config found, view related [doc](https://tidyread.info/docs/ai-translate) to know more.",
  waiting: "waiting...",
  start: "translating...",
  success: "success",
  failed: "failed",
};

const pullItemsStatusMap = {
  waiting: "waiting...",
  start: "pulling...",
  failed: "pull failed",
};

export default function GenTodaysDigestPanel({
  onSuccess,
  onFailed,
}: {
  onSuccess?: () => void;
  onFailed?: () => void;
}) {
  const { push } = useNavigation();
  const preferences = normalizePreference();
  const { preferredLanguage } = preferences;
  const settingsForDebug = pick(preferences, [
    "provider",
    "apiModel",
    "apiHost",
    "maxTokens",
    "summarizePrompt",
    "httpProxy",
    "preferredLanguage",
    "maxApiConcurrency",
    "retryCount",
    "retryDelay",
    "requestTimeout",
  ]);
  const [status, setStatus] = useState<"generating" | "success" | "failed">("generating");
  const [pullItemsStatus, setPullItemsStatus] = useState<"waiting" | "start" | "success" | "failed">("waiting");
  const [translateStatus, setTranslateStatus] = useState<"no-config" | "waiting" | "start" | "success" | "failed">(
    preferredLanguage ? "waiting" : "no-config",
  );
  const [sumarizeItemStatus, setSumarizeItemStatus] = useState<"waiting" | "start">("waiting");
  const [digest, setDigest] = useState<Digest | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [total, setTotal] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [successItemsNum, setSuccessItemsNum] = useState(0);
  const [failedItemsNum, setFailedItemsNum] = useState(0);
  const [rawItemsNum, setRawItemsNum] = useState(0);

  const md = `
  ${
    status === "failed"
      ? `> ❗**Digest failed to generate**, error is: \`${errorMessage}\`. View related [doc](https://tidyread.info/docs/why-digest-failed) to know more.\n`
      : ""
  }
  📊 \`Total Items\`  ${pullItemsStatus === "success" ? `**${total}**` : pullItemsStatusMap[pullItemsStatus]}\n
  🔄 \`Translate Titles\`  ${translateStatusMap[translateStatus]}\n
  ${
    sumarizeItemStatus === "start"
      ? `
  📜 \`Raw Content Items\`  **${rawItemsNum}**\n
  ✅ \`Success AI Summarized Items\`  **${successItemsNum}**\n
  ❌ \`Failed AI Summarized Items\`  **${failedItemsNum}**\n
  `
      : ""
  }\n
  ⌛ \`Total Time\`  ${totalTime ? `**${formatSeconds(totalTime)}**` : "--"}
  
  ### 💡 Tips
  - Can't stand manually generating? Check [this](https://tidyread.info/docs/automate-daily-digest) to free your hand.
  - Generating process is too slow? Check [this](https://tidyread.info/docs/why-digest-failed#excessive-execution-time) to speed up.
  `;

  const manageSourceListActionNode = (
    <Action
      title="Manage Source List"
      shortcut={Keyboard.Shortcut.Common.Edit}
      icon={Icon.Pencil}
      onAction={() => {
        launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
      }}
    />
  );

  const handleGenDigest = async (type: "manual" | "auto" = "manual") => {
    const startTime = Date.now();
    try {
      showToast(Toast.Style.Animated, "Generating Digest...");
      const digest = await bizGenDigest(type, (stage) => {
        const { stageName, status } = stage;

        if (stageName === "pull_items") {
          if (status === "start") {
            setPullItemsStatus("start");
          } else if (status === "success") {
            setPullItemsStatus("success");
            setTotal(stage.data);
            console.log("pullitems stage.data", stage.data);
          } else if (status === "failed") {
            setPullItemsStatus("failed");
          }
        }

        if (stageName === "translate_titles") {
          if (status === "start") {
            setTranslateStatus("start");
          } else if (status === "success") {
            setTranslateStatus("success");
          } else if (status === "failed") {
            setTranslateStatus("failed");
          }
        }

        if (stageName === "summarize_item") {
          if (status === "start") {
            setSumarizeItemStatus("start");
          } else if (status === "success") {
            if (stage.type === "ai") {
              setSuccessItemsNum((prev) => prev + 1);
            } else {
              setRawItemsNum((prev) => prev + 1);
            }
          } else if (status === "failed") {
            setFailedItemsNum((prev) => prev + 1);
          }
        }
      });
      setTotalTime(dayjs().diff(dayjs(startTime), "second"));
      setDigest(digest);
      setStatus("success");
      showToast(Toast.Style.Success, "Generating Success");
      onSuccess?.();
    } catch (err: any) {
      setTotalTime(dayjs().diff(dayjs(startTime), "second"));
      setStatus("failed");
      setErrorMessage(err.message);
      onFailed?.();
      if (matchError(err, NO_API_KEY)) {
        showToast(Toast.Style.Failure, "Generating Failed");
        const markdown = "API key not found. Press Enter to update it in command preferences and try again.";

        push(<Detail markdown={markdown} actions={<CustomActionPanel />} />);
        return;
      }

      if (matchError(err, NO_FEEDS)) {
        showToast(Toast.Style.Failure, "Generating Failed");
        const markdown =
          "No RSS link found in today's sources, please add some and try again. Press `Enter` to manage your sources. \n\nIf you don't know **how to find website's RSS link**, you can check this [doc](https://www.tidyread.info/docs/where-to-find-rss).";

        push(
          <Detail markdown={markdown} actions={<CustomActionPanel>{manageSourceListActionNode}</CustomActionPanel>} />,
        );
        return;
      }

      if (matchError(err, "ECONNRESET")) {
        showToast(Toast.Style.Failure, "Network Error", "Check your network and try again.");
        return;
      }

      if (matchError(err, "timed out")) {
        showToast(Toast.Style.Failure, "Request Timeout", "Check your network, or add http proxy and try again.");
        return;
      }

      showToast(Toast.Style.Failure, "Error", err.message);
    }
  };

  useEffect(() => {
    handleGenDigest();
  }, []);

  return (
    <Detail
      navigationTitle={navTitleMap[status]}
      actions={
        <ActionPanel>
          {digest && (
            <Action
              icon={Icon.Eye}
              title="View Detail"
              onAction={() => {
                push(<DigestDetail digest={digest} />);
              }}
            />
          )}
          {status !== "generating" && (
            <>
              <Action.CopyToClipboard title="Copy Content" content={md} />
              <Action.CopyToClipboard title="Copy Settings" content={JSON.stringify(settingsForDebug, null, 2)} />
            </>
          )}
        </ActionPanel>
      }
      markdown={md}
    />
  );
}
