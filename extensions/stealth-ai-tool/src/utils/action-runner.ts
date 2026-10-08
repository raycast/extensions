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
  "action-1": {
    title: "Fix Grammar",
    prompt:
      "Fix all typos, spelling errors, and grammar issues in the following text. IMPORTANT: Do NOT change the capitalization of the first character - if it starts with a lowercase letter, keep it lowercase. Return only the corrected text without any explanation:",
  },
  "action-2": {
    title: "Make Concise",
    prompt:
      "Make the following text more concise while preserving the key meaning. Return only the rewritten text without explanation:",
  },
  "action-3": {
    title: "Create List",
    prompt:
      "Convert the following text into a clean bullet point list. Return only the list without explanation:",
  },
  "action-4": {
    title: "Make Professional",
    prompt:
      "Rewrite the following text to be more professional and polished, suitable for business communication. Return only the rewritten text without explanation:",
  },
  "action-5": {
    title: "Simplify",
    prompt:
      "Simplify the following text to make it easier to understand. Use simpler words and shorter sentences. Return only the simplified text without explanation:",
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
  console.log(`--- Starting runStealthAction: ${actionId} at ${now} ---`);

  // Concurrency lock with time-based debounce
  if (isRunning) {
    console.log("[LOCKED] Action already running. Aborting.");
    return;
  }

  // Debounce: don't run if last run was less than 3 seconds ago
  if (now - lastRunTime < 3000) {
    console.log(
      `[DEBOUNCE] Last run was ${now - lastRunTime}ms ago. Aborting.`,
    );
    return;
  }

  isRunning = true;
  lastRunTime = now;

  try {
    await runStealthActionInternal(actionId, forceEditor);
  } finally {
    isRunning = false;
    console.log(`--- Finished runStealthAction: ${actionId} ---`);
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
  console.log(`Config: ${currentConfig.title}`);

  const isMac = process.platform === "darwin";

  // Store original app info for re-activation (macOS only)
  let frontApp = "";
  let frontAppBundleId = "";

  if (isMac) {
    // macOS: Get the PREVIOUS frontmost app (not Raycast)
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

      console.log(`[DEBUG] Previous app result: ${previousAppResult}`);

      const match = previousAppResult.match(/^(.+?),\s*(.+)$/);
      if (match) {
        frontApp = match[1].trim();
        frontAppBundleId = match[2].trim();
      } else {
        frontApp = previousAppResult;
      }

      console.log(`[DEBUG] Target app: ${frontApp} (${frontAppBundleId})`);

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
        console.log(`[DEBUG] Fallback app: ${frontApp}`);
      }
    } catch (e) {
      console.log(`[DEBUG] Could not get frontmost app: ${e}`);
    }

    if (frontApp === "Raycast") {
      frontApp = "";
      frontAppBundleId = "";
    }
  }

  // 2. AI Access Debug (for troubleshooting "Model not supported")
  let canAccessAI = false;
  try {
    canAccessAI = environment.canAccess(AI);
    console.log(`[DEBUG] environment.canAccess(AI): ${canAccessAI}`);
  } catch (e) {
    console.log(`[DEBUG] environment.canAccess(AI) failed with error: ${e}`);
  }

  try {
    console.log("AI.Model Keys: " + Object.keys(AI.Model).join(", "));
    const mapping: Record<string, string> = {};
    for (const key of Object.keys(AI.Model)) {
      try {
        mapping[key] = (AI.Model as Record<string, string>)[key];
      } catch (_e) {
        // ignore
      }
    }
    console.log("[DEBUG] AI.Model Mapping:", JSON.stringify(mapping, null, 2));
  } catch (e) {
    console.log(`[DEBUG] AI.Model logging failed: ${e}`);
  }

  // 3. Get selected text using Raycast's native cross-platform API
  let selectedText = "";
  let hasRealSelection = false;

  try {
    if (!forceEditor) {
      console.log("[DEBUG] Using Raycast getSelectedText API...");
      selectedText = await getSelectedText();
      console.log(
        `[DEBUG] Got selected text: "${selectedText.substring(0, 50)}..." (${selectedText.length} chars)`,
      );
      hasRealSelection = selectedText.trim().length > 0;
    }
  } catch (e) {
    console.log(`[DEBUG] getSelectedText failed (no selection): ${e}`);
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

  // 4. Show processing toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${currentConfig.title}...`,
  });

  try {
    // 5. Final AI access check
    const currentProvider = await LLMService.getProvider();
    if (!canAccessAI && currentProvider === "raycast") {
      throw new Error("Raycast AI is required. Please upgrade to Raycast Pro.");
    }

    // 6. Call AI (using new LLM Service)
    const prompt = `${currentConfig.prompt}\n\n${selectedText}`;
    console.log(`Calling AI via ${currentProvider}...`);

    let result = "";
    try {
      result = await LLMService.askAI(prompt);
      console.log(`AI result: "${result?.substring(0, 50)}..."`);
    } catch (e) {
      console.error(`AI Service failed: ${e}`);

      const errorMsg = (e as Error).message;

      // Check for model-related errors
      if (/model/i.test(errorMsg)) {
        await showModelErrorToast(errorMsg);
        return;
      }

      // Special handling for Raycast AI limitation
      if (errorMsg.includes("Raycast AI is not supported")) {
        await showModelErrorToast(errorMsg);
        return;
      }

      // Clipboard Fallback
      console.log("[DEBUG] AI Service failed. Using Clipboard Fallback.");
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

    // 7. Insert text (for successful calls)
    toast.title = "Inserting...";
    console.log(`Pasting ${cleanResult.length} chars to replace selection`);

    if (isMac) {
      // ... existing macOS logic ...
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

    await Clipboard.paste(cleanResult);
    toast.style = Toast.Style.Success;
    toast.title = "Done!";
  } catch (error) {
    console.error("Error:", error);
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
