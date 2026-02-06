import { showToast, Toast, Clipboard } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function sendKey(key: string, modifiers: string[] = []) {
  const modifierStr =
    modifiers.length > 0
      ? `using {${modifiers.map((m) => `${m} down`).join(", ")}}`
      : "";
  const script = `tell application "System Events" to keystroke "${key}" ${modifierStr}`;
  await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
}

async function typeCharacter(char: string) {
  // Use fast clipboard paste for regular characters
  await Clipboard.paste(char);
}

export async function showCountdown(
  duration: number,
  showToasts: boolean = true,
) {
  if (!showToasts || duration === 0) {
    // No countdown, just wait silently
    if (duration > 0) {
      await new Promise((resolve) => setTimeout(resolve, duration * 1000));
    }
    return;
  }

  let toast: Toast | undefined;

  for (let i = duration; i > 0; i--) {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: `Starting in ${i}...`,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Hide the toast immediately after countdown
  if (toast) {
    toast.hide();
  }
}

export interface ParsedToken {
  type: "text" | "delay" | "key" | "keycombo" | "speed";
  value: string | number;
  modifiers?: string[];
}

export function parseScript(script: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  let currentText = "";
  let i = 0;

  while (i < script.length) {
    // Check for escape sequences
    if (script[i] === "\\") {
      if (i + 1 < script.length) {
        const nextChar = script[i + 1];

        // \[ for literal bracket
        if (nextChar === "[") {
          currentText += "[";
          i += 2;
          continue;
        }

        // \n for explicit newline
        if (nextChar === "n") {
          currentText += "\n";
          i += 2;
          continue;
        }

        // \\ for literal backslash
        if (nextChar === "\\") {
          currentText += "\\";
          i += 2;
          continue;
        }

        // Line continuation: backslash followed by newline = skip the newline
        if (nextChar === "\n" || nextChar === "\r") {
          // Skip the backslash and the newline
          i += 2;
          // Also skip \r\n if present
          if (nextChar === "\r" && i < script.length && script[i] === "\n") {
            i++;
          }
          continue;
        }
      }
    }

    // Check for special markers [...]
    if (script[i] === "[") {
      const closeBracket = script.indexOf("]", i);
      if (closeBracket !== -1) {
        const content = script.slice(i + 1, closeBracket).trim();

        // Push any accumulated text first
        if (currentText) {
          tokens.push({ type: "text", value: currentText });
          currentText = "";
        }

        // Check for [enter]
        if (content.toLowerCase() === "enter") {
          tokens.push({ type: "key", value: "return" });
          i = closeBracket + 1;
          continue;
        }

        // Check for [tab]
        if (content.toLowerCase() === "tab") {
          tokens.push({ type: "key", value: "tab" });
          i = closeBracket + 1;
          continue;
        }

        // Check for [escape]
        if (
          content.toLowerCase() === "escape" ||
          content.toLowerCase() === "esc"
        ) {
          tokens.push({ type: "key", value: "escape" });
          i = closeBracket + 1;
          continue;
        }

        // Check for [space]
        if (content.toLowerCase() === "space") {
          tokens.push({ type: "key", value: "space" });
          i = closeBracket + 1;
          continue;
        }

        // Check for [delete] or [backspace]
        if (
          content.toLowerCase() === "delete" ||
          content.toLowerCase() === "backspace"
        ) {
          tokens.push({ type: "key", value: "delete" });
          i = closeBracket + 1;
          continue;
        }

        // Check for key combinations with modifiers
        // Supports: ctrl+key, cmd+key, alt+key, shift+key, option+key
        // Also supports multi-modifier combos like cmd+shift+key
        const modifierPattern = /^(ctrl|cmd|command|alt|option|shift)(\+|$)/i;
        if (modifierPattern.test(content)) {
          const parts = content.toLowerCase().split("+");
          const modifiers: string[] = [];
          let key = "";

          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed === "ctrl" || trimmed === "control") {
              modifiers.push("control");
            } else if (trimmed === "cmd" || trimmed === "command") {
              modifiers.push("command");
            } else if (trimmed === "alt" || trimmed === "option") {
              modifiers.push("option");
            } else if (trimmed === "shift") {
              modifiers.push("shift");
            } else if (trimmed) {
              // This must be the key
              key = trimmed;
            }
          }

          tokens.push({
            type: "keycombo",
            value: key,
            modifiers: modifiers,
          });
          i = closeBracket + 1;
          continue;
        }

        // Check for speed control [speed:X] or [speed:default]
        if (content.toLowerCase().startsWith("speed:")) {
          const speedValue = content.slice(6).trim().toLowerCase();
          if (speedValue === "default") {
            tokens.push({ type: "speed", value: "default" });
          } else {
            const speed = parseInt(speedValue);
            if (!isNaN(speed) && speed > 0) {
              tokens.push({ type: "speed", value: speed });
            }
          }
          i = closeBracket + 1;
          continue;
        }

        // Check for delay marker [number]
        const delay = parseFloat(content);
        if (!isNaN(delay)) {
          // Push delay token (convert to milliseconds)
          tokens.push({ type: "delay", value: delay * 1000 });
          i = closeBracket + 1;
          continue;
        }
      }
    }

    // Regular character (including newlines - they'll be typed normally)
    currentText += script[i];
    i++;
  }

  // Push remaining text
  if (currentText) {
    tokens.push({ type: "text", value: currentText });
  }

  return tokens;
}

export async function typeWithDelay(
  tokens: ParsedToken[],
  baseDelay: number,
  showToasts: boolean = true,
) {
  let currentDelay = baseDelay; // Track current typing speed
  const originalDelay = baseDelay; // Store original for [speed:default]

  for (const token of tokens) {
    if (token.type === "speed") {
      // Change typing speed
      if (token.value === "default") {
        currentDelay = originalDelay;
      } else {
        currentDelay = token.value as number;
      }
      continue;
    }

    if (token.type === "delay") {
      const delayMs = token.value as number;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } else if (token.type === "key") {
      // Send special key using key code for better reliability
      const keyName = token.value as string;
      let script = "";

      // Use key codes for special keys to avoid them being typed as text
      switch (keyName) {
        case "return":
          script = `tell application "System Events" to key code 36`; // Return key
          break;
        case "tab":
          script = `tell application "System Events" to key code 48`; // Tab key
          break;
        case "escape":
          script = `tell application "System Events" to key code 53`; // Escape key
          break;
        case "space":
          script = `tell application "System Events" to key code 49`; // Space key
          break;
        case "delete":
          script = `tell application "System Events" to key code 51`; // Delete key
          break;
        default:
          script = `tell application "System Events" to keystroke "${keyName}"`;
      }

      await execAsync(`osascript -e '${script}'`);
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    } else if (token.type === "keycombo") {
      // Send key combination (like Cmd+C)
      const key = token.value as string;
      const modifiers = token.modifiers || [];

      if (key) {
        await sendKey(key, modifiers);
      }
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    } else {
      // Type text character by character
      const text = token.value as string;
      for (const char of text) {
        await typeCharacter(char);
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
      }
    }
  }

  // Typing completed successfully
  if (showToasts) {
    await showToast({
      style: Toast.Style.Success,
      title: "Typing complete!",
    });
  }
}
