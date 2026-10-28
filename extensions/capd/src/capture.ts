import {
  Clipboard,
  LaunchProps,
  Toast,
  getSelectedText,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { add } from "./capd";
import { CapdNotInstalled, wasAlreadyCaptured } from "./contract";

const INSTALL_GUIDE = "https://capd.jxd.dev/install";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Capture }>) {
  const input = await resolveInput(props);
  if (!input) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Nothing to capture",
      message: "Pass a URL or some text, select something, or copy it first.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Capturing…",
  });

  try {
    const line = await add(input);
    toast.style = Toast.Style.Success;
    toast.title = wasAlreadyCaptured(line) ? "Already in Capd" : "Captured";
    toast.message = line;
  } catch (error) {
    toast.style = Toast.Style.Failure;

    if (error instanceof CapdNotInstalled) {
      toast.title = "Capd isn't installed";
      toast.message = "Install Capd, or set the capd binary path in preferences.";
      toast.primaryAction = {
        title: "Open Installation Guide",
        onAction: () => open(INSTALL_GUIDE),
      };
      toast.secondaryAction = {
        title: "Open Extension Preferences",
        onAction: openExtensionPreferences,
      };
      return;
    }

    toast.title = "Could not capture";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

/**
 * Falls back through the ways Raycast can hand over content, so the command works as an
 * argument command, as a fallback command from root search, and as a bare hotkey.
 */
async function resolveInput(props: LaunchProps<{ arguments: Arguments.Capture }>): Promise<string | undefined> {
  const sources = [async () => props.arguments?.input, async () => props.fallbackText, selectedText, clipboardText];

  for (const source of sources) {
    const candidate = (await source())?.trim();
    if (candidate) {
      return candidate;
    }
  }
  return undefined;
}

async function selectedText(): Promise<string | undefined> {
  try {
    return await getSelectedText();
  } catch {
    return undefined;
  }
}

async function clipboardText(): Promise<string | undefined> {
  try {
    return await Clipboard.readText();
  } catch {
    return undefined;
  }
}
