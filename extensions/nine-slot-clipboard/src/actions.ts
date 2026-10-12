import {
  Clipboard,
  LocalStorage,
  closeMainWindow,
  getPreferenceValues,
  getSelectedText,
  showHUD,
} from "@raycast/api";
import {
  MAX_SLOT_LENGTH,
  SLOT_NUMBERS,
  TEXT_TOO_LONG,
  isAccessibilityError,
  normalizeCaptureSource,
  resolveCapture,
  slotKey,
  type CaptureResult,
  type Slot,
} from "./slots";

interface Preferences {
  captureSource: string;
  alsoCopyToClipboard: boolean;
}

async function readSelection(): Promise<
  { ok: true; text: string } | { ok: false; permissionDenied: boolean }
> {
  try {
    return { ok: true, text: await getSelectedText() };
  } catch (error) {
    console.error(error);
    return { ok: false, permissionDenied: isAccessibilityError(error) };
  }
}

async function readClipboardText(): Promise<string | undefined> {
  try {
    return await Clipboard.readText();
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

async function captureText(): Promise<CaptureResult> {
  const preferences = getPreferenceValues<Preferences>();
  const setting = normalizeCaptureSource(preferences.captureSource);
  const selection =
    setting === "clipboard"
      ? { ok: false as const, permissionDenied: false }
      : await readSelection();
  const selectionHasText = selection.ok && selection.text.length > 0;
  const permissionDenied = !selection.ok && selection.permissionDenied;
  const needsClipboard =
    setting === "clipboard" ||
    (setting === "selection-then-clipboard" &&
      !permissionDenied &&
      !selectionHasText);
  const clipboardText = needsClipboard ? await readClipboardText() : undefined;
  return resolveCapture({ setting, selection, clipboardText });
}

export async function copyToSlot(slot: Slot): Promise<void> {
  try {
    await closeMainWindow({ clearRootSearch: true });
    const captured = await captureText();
    if (!captured.ok) {
      await showHUD(captured.message);
      return;
    }
    if (captured.text.length > MAX_SLOT_LENGTH) {
      await showHUD(TEXT_TOO_LONG);
      return;
    }

    await LocalStorage.setItem(slotKey(slot), captured.text);

    const preferences = getPreferenceValues<Preferences>();
    if (
      captured.source === "selection" &&
      preferences.alsoCopyToClipboard !== false
    ) {
      try {
        await Clipboard.copy(captured.text);
      } catch (error) {
        console.error(error);
        await showHUD(
          `Saved to slot ${slot}, but the system clipboard was not updated`,
        );
        return;
      }
    }

    await showHUD(`Saved to slot ${slot}`);
  } catch (error) {
    console.error(error);
    await showHUD(`Couldn't save slot ${slot}`);
  }
}

export async function pasteSlot(slot: Slot): Promise<void> {
  try {
    await closeMainWindow({ clearRootSearch: true });
    const stored = await LocalStorage.getItem<string>(slotKey(slot));
    if (typeof stored !== "string" || stored.length === 0) {
      await showHUD(`Slot ${slot} is empty`);
      return;
    }
    await Clipboard.paste(stored);
    await showHUD(`Pasted slot ${slot}`);
  } catch (error) {
    console.error(error);
    await showHUD(`Couldn't paste slot ${slot}`);
  }
}

export async function readAllSlots(): Promise<
  Record<Slot, string | undefined>
> {
  const items = await LocalStorage.allItems();
  const slots = {} as Record<Slot, string | undefined>;
  for (const slot of SLOT_NUMBERS) {
    const value = items[slotKey(slot)];
    slots[slot] =
      typeof value === "string" && value.length > 0 ? value : undefined;
  }
  return slots;
}

export async function clearSlot(slot: Slot): Promise<void> {
  await LocalStorage.removeItem(slotKey(slot));
}

export async function clearAllSlots(): Promise<void> {
  await Promise.all(
    SLOT_NUMBERS.map((slot) => LocalStorage.removeItem(slotKey(slot))),
  );
}
