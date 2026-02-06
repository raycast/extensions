import {
  AI,
  Clipboard,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";

import { execSync } from "child_process";
import { platform } from "os";

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

  const isMac = platform() === "darwin";

  // 2. Get selected text
  let selectedText = "";
  let hasRealSelection = false;

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

  // Use Raycast's cross-platform Clipboard API to read selected text
  // First, clear clipboard with a marker to detect if copy happens
  const marker = `__NO_SELECTION_${Date.now()}__`;

  try {
    await Clipboard.copy(marker);
    console.log("[DEBUG] Clipboard cleared with marker");
  } catch {
    console.log("[DEBUG] Could not clear clipboard");
  }

  try {
    if (!forceEditor) {
      // Simulate Cmd+C / Ctrl+C to copy selection
      console.log("[DEBUG] Sending copy command...");

      if (isMac) {
        execSync(
          `osascript -e 'tell application "System Events" to key code 8 using command down'`,
        );
      } else {
        // Windows: Use PowerShell to send Ctrl+C
        execSync(
          `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`,
        );
      }

      // Wait for clipboard to update
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Check what's in clipboard now using Raycast API
      let clipboardAfter = "";
      try {
        clipboardAfter = (await Clipboard.readText()) || "";
        console.log(
          `[DEBUG] Clipboard after copy: "${clipboardAfter.substring(0, 50)}" (${clipboardAfter.length} chars)`,
        );

        if (clipboardAfter === marker) {
          console.log(
            "[DEBUG] Clipboard still has marker - NO SELECTION, auto-selecting line...",
          );

          if (isMac) {
            // macOS: Auto-select current line
            execSync(
              `osascript -e 'tell application "System Events"
                key code 124 using command down
                delay 0.05
                key code 123 using {command down, shift down}
                delay 0.05
                key code 8 using command down
              end tell'`,
            );
          } else {
            // Windows: Home, then Shift+End to select line, then Ctrl+C
            execSync(
              `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('{END}'); Start-Sleep -Milliseconds 50; [System.Windows.Forms.SendKeys]::SendWait('+{HOME}'); Start-Sleep -Milliseconds 50; [System.Windows.Forms.SendKeys]::SendWait('^c')"`,
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 200));

          clipboardAfter = (await Clipboard.readText()) || "";
          console.log(
            `[DEBUG] Clipboard after auto-select: "${clipboardAfter.substring(0, 50)}" (${clipboardAfter.length} chars)`,
          );

          if (clipboardAfter !== marker && clipboardAfter.trim().length > 0) {
            console.log("[DEBUG] Line auto-selected successfully!");
            hasRealSelection = true;
            selectedText = clipboardAfter;
          } else {
            console.log("[DEBUG] Auto-select failed - empty line?");
            hasRealSelection = false;
          }
        } else {
          console.log("[DEBUG] REAL SELECTION detected!");
          hasRealSelection = true;
          selectedText = clipboardAfter;
        }
      } catch {
        console.log("[DEBUG] Could not read clipboard");
      }
    }
  } catch (e) {
    console.log(`[DEBUG] Error: ${e}`);
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
      title: "Edit Prompt",
      onAction: () => {
        launchCommand({
          name: "edit-action",
          type: LaunchType.UserInitiated,
          arguments: { actionId },
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
    // 4. Call AI
    const prompt = `${currentConfig.prompt}\n\n${selectedText}`;
    console.log("Calling AI...");
    const result = await AI.ask(prompt);
    console.log(`AI result: "${result?.substring(0, 50)}..."`);

    if (!result) throw new Error("Empty AI response");

    const cleanResult = result.trim();

    // 5. Insert text using Raycast's cross-platform Clipboard.paste API
    toast.title = "Inserting...";
    console.log(`Pasting ${cleanResult.length} chars to replace selection`);

    // Re-activate the original app before pasting (macOS only)
    if (isMac) {
      if (frontAppBundleId && frontAppBundleId !== "com.apple.finder") {
        try {
          execSync(
            `osascript -e 'tell application id "${frontAppBundleId}" to activate'`,
            { timeout: 5000 },
          );
          await new Promise((resolve) => setTimeout(resolve, 150));
          console.log(
            `[DEBUG] Re-activated app by bundle ID: ${frontAppBundleId}`,
          );
        } catch (e) {
          console.log(`[DEBUG] Could not activate by bundle ID: ${e}`);
          if (frontApp && frontApp !== "Finder") {
            try {
              const escapedAppName = frontApp.replace(/"/g, '\\"');
              execSync(
                `osascript -e 'tell application "${escapedAppName}" to activate'`,
                { timeout: 5000 },
              );
              await new Promise((resolve) => setTimeout(resolve, 150));
              console.log(`[DEBUG] Re-activated app by name: ${frontApp}`);
            } catch (e2) {
              console.log(
                `[DEBUG] Could not re-activate by name either: ${e2}`,
              );
            }
          }
        }
      } else if (frontApp && frontApp !== "Finder") {
        try {
          const escapedAppName = frontApp.replace(/"/g, '\\"');
          execSync(
            `osascript -e 'tell application "${escapedAppName}" to activate'`,
            { timeout: 5000 },
          );
          await new Promise((resolve) => setTimeout(resolve, 150));
          console.log(`[DEBUG] Re-activated app by name: ${frontApp}`);
        } catch (e) {
          console.log(`[DEBUG] Could not re-activate original app: ${e}`);
        }
      } else {
        // No valid app to re-activate - use clipboard only mode
        console.log(
          "[DEBUG] No valid app to re-activate, using clipboard only",
        );
        await Clipboard.copy(cleanResult);
        toast.style = Toast.Style.Success;
        toast.title = "Copied to clipboard";
        toast.message = "Press Cmd+V to paste";
        return;
      }
    }

    // Use Raycast's cross-platform paste API
    // This handles clipboard + paste in one call and works on both macOS and Windows
    await Clipboard.paste(cleanResult);
    console.log("Text inserted successfully");

    toast.style = Toast.Style.Success;
    toast.title = "Done!";
  } catch (error) {
    console.error("Error:", error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = String(error);
  }
}
