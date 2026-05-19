import {
  AI,
  Clipboard,
  environment,
  getPreferenceValues,
  getSelectedText,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";

import { execSync } from "child_process";
import { LLMService } from "./llm-service";

interface ActionConfig {
  title: string;
  prompt: string;
}

const DEFAULT_CONFIGS: Record<string, ActionConfig> = {
  "custom-run": {
    title: "Running Action",
    prompt: "",
  },
};

// In-memory lock to prevent concurrent executions
let isRunning = false;
let lastRunTime = 0;

export async function runStealthAction(
  actionId: string,
  forceEditor?: boolean,
) {
  const now = Date.now();

  if (isRunning) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Action already running",
    });
    return;
  }

  // Debounce: don't run if last run was less than 3 seconds ago
  if (now - lastRunTime < 3000) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please wait a moment before running again",
    });
    return;
  }

  isRunning = true;
  lastRunTime = now;

  try {
    await runStealthActionInternal(actionId, forceEditor);
  } finally {
    isRunning = false;
  }
}

async function showModelErrorToast(errorMsg: string) {
  const isModelError = /model/i.test(errorMsg);
  const toast = await showToast({
    style: Toast.Style.Failure,
    title: isModelError ? "Model Error" : "AI Call Failed",
    message: isModelError ? "Run 'Configure AI Model' to fix this" : errorMsg,
  });
  if (isModelError) {
    toast.primaryAction = {
      title: "Configure AI Model",
      onAction: () => {
        launchCommand({
          name: "configure-model",
          type: LaunchType.UserInitiated,
        });
      },
    };
  }
  return toast;
}

async function runStealthActionInternal(
  actionId: string,
  forceEditor?: boolean,
) {
  // 1. Load config
  const prefs = getPreferenceValues();
  let currentConfig: ActionConfig = {
    title:
      (prefs.title as string) || DEFAULT_CONFIGS[actionId]?.title || actionId,
    prompt: (prefs.prompt as string) || DEFAULT_CONFIGS[actionId]?.prompt || "",
  };

  try {
    const saved = await LocalStorage.getItem<string>("action-configs");
    if (saved) {
      const configs = JSON.parse(saved);
      if (configs[actionId]) {
        currentConfig = { ...currentConfig, ...configs[actionId] };
      }
    }
  } catch (e) {
    console.error("Failed to load configs", e);
  }

  const isMac = process.platform === "darwin";

  let frontApp = "";
  let frontAppBundleId = "";

  if (isMac) {
    try {
      const previousAppResult = execSync(
        `osascript -e '
          tell application "System Events"
            set frontProc to first process whose frontmost is true
            set frontName to name of frontProc
            if frontName is "Raycast" then
              set allProcs to every process whose visible is true and name is not "Raycast"
              if (count of allProcs) > 0 then
                set targetProc to item 1 of allProcs
                return {name of targetProc, bundle identifier of targetProc}
              else
                return {"", ""}
              end if
            else
              return {frontName, bundle identifier of frontProc}
            end if
          end tell
        '`,
      )
        .toString()
        .trim();

      const match = previousAppResult.match(/^(.+?),\s*(.+)$/);
      if (match) {
        frontApp = match[1].trim();
        frontAppBundleId = match[2].trim();
      } else {
        frontApp = previousAppResult;
      }

      if (!frontApp || frontApp === "Raycast" || frontApp === "") {
        const fallbackResult = execSync(
          `osascript -e '
            tell application "System Events"
              set procList to name of every process whose visible is true and name is not "Raycast" and name is not "Finder"
              if (count of procList) > 0 then
                return item 1 of procList
              else
                return "Finder"
              end if
            end tell
          '`,
        )
          .toString()
          .trim();
        frontApp = fallbackResult;
      }
    } catch (e) {
      // ignore — proceed without app reactivation
    }

    if (frontApp === "Raycast") {
      frontApp = "";
      frontAppBundleId = "";
    }
  }

  let canAccessAI = false;
  try {
    canAccessAI = environment.canAccess(AI);
  } catch (e) {
    // ignore
  }

  // 2. Get selected text
  let selectedText = "";
  let hasRealSelection = false;

  try {
    if (!forceEditor) {
      selectedText = await getSelectedText();
      hasRealSelection = selectedText.trim().length > 0;
    }
  } catch (e) {
    hasRealSelection = false;
  }

  if (
    forceEditor ||
    !hasRealSelection ||
    !selectedText ||
    selectedText.trim().length === 0
  ) {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title: "No text selected",
      message: "Please select text first",
    });
    toast.primaryAction = {
      title: "Configure AI Model",
      onAction: () => {
        launchCommand({
          name: "configure-model",
          type: LaunchType.UserInitiated,
        });
      },
    };
    return;
  }

  // 3. Show processing toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${currentConfig.title}...`,
  });

  try {
    const currentProvider = await LLMService.getProvider();
    if (!canAccessAI && currentProvider === "raycast") {
      throw new Error("Raycast AI is required. Please upgrade to Raycast Pro.");
    }

    const prompt = `${currentConfig.prompt}\n\n---\nText to format:\n${selectedText}`;

    let result = "";
    try {
      result = await LLMService.askAI(prompt);
    } catch (e) {
      const errorMsg = (e as Error).message;

      if (/model/i.test(errorMsg)) {
        await showModelErrorToast(errorMsg);
        return;
      }

      if (errorMsg.includes("Raycast AI is not supported")) {
        await showModelErrorToast(errorMsg);
        return;
      }

      await Clipboard.copy(prompt);
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Call Failed",
        message: "Prompt copied! Paste in external AI tool.",
      });
      return;
    }

    if (!result) throw new Error("Empty AI response");

    const cleanResult = result.trim();

    toast.title = "Inserting...";

    if (isMac) {
      if (frontAppBundleId && frontAppBundleId !== "com.apple.finder") {
        try {
          execSync(
            `osascript -e 'tell application id "${frontAppBundleId}" to activate'`,
            { timeout: 5000 },
          );
          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (_e) {
          // ignore activation errors
        }
      } else if (frontApp && frontApp !== "Finder") {
        try {
          const escapedAppName = frontApp.replace(/"/g, '\\"');
          execSync(
            `osascript -e 'tell application "${escapedAppName}" to activate'`,
            { timeout: 5000 },
          );
          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (_e) {
          // ignore activation errors
        }
      }
    }

    await Clipboard.copy(cleanResult);
    await Clipboard.paste(cleanResult);
    toast.style = Toast.Style.Success;
    toast.title = "Done!";
  } catch (error) {
    const errorMsg = String(error);
    if (/model/i.test(errorMsg)) {
      await showModelErrorToast(errorMsg);
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = errorMsg;
    }
  }
}
