import { getPreferenceValues, Image, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { performMenuBarAction, performMenuBarShortcut } from "./api";
import { CLICK_TYPE_PAST_TENSE } from "./constants";
import { ActionType, MenuBarDetail, Result, ShortcutKeyType, Success } from "./types";

export async function handlePerformMenuBarAction(menuBarId: string, actionType: ActionType): Promise<boolean> {
  const { showHudOnSuccess } = getPreferenceValues<Preferences>();

  const result = await runWithErrorToast(
    () => performMenuBarAction(menuBarId, actionType),
    `Failed to ${CLICK_TYPE_PAST_TENSE[actionType].toLowerCase()} menu bar item`,
  );

  if (result) {
    if (showHudOnSuccess) {
      await showHUD(`${CLICK_TYPE_PAST_TENSE[actionType]}: ${menuBarId}`);
    }
    return true;
  }
  return false;
}

export async function handlePerformMenuBarShortcut(params: {
  menuBarId: string;
  actionType: ActionType;
  keySequence: ShortcutKeyType[];
  clickDelay?: number;
  keypressDelay?: number;
}): Promise<boolean> {
  const { menuBarId, actionType, keySequence, clickDelay, keypressDelay } = params;
  const { showHudOnSuccess } = getPreferenceValues<Preferences>();

  const result = await runWithErrorToast(
    () =>
      performMenuBarShortcut({
        menuBarId: menuBarId,
        actionType: actionType,
        keySequence: keySequence,
        customClickDelay: clickDelay,
        customKeypressDelay: keypressDelay,
      }),
    `Failed to execute shortcut`,
  );

  if (result) {
    if (showHudOnSuccess) {
      await showHUD(`${CLICK_TYPE_PAST_TENSE[actionType]}: ${menuBarId}`);
    }
    return true;
  }
  return false;
}

export function getIconFromMenuBarDetail(icon: MenuBarDetail["icon"]): Image.ImageLike {
  if (!icon) {
    return { fileIcon: "/System/Library/CoreServices/Spotlight.app" };
  }

  switch (icon.type) {
    case "app":
      return { fileIcon: icon.path };
    case "asset":
      return icon.path;
    default:
      return icon satisfies never;
  }
}

export async function runWithErrorToast<T>(
  fn: () => Promise<Result<T>> | Result<T>,
  title = "An Error Occurred",
): Promise<Success<T> | undefined> {
  let error: string | undefined;
  try {
    const result = await fn();
    if (result.status === "success") {
      return result;
    }
    error = result.error;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (error) {
    await showFailureToast(error, { title: title });
  }
  return undefined;
}
