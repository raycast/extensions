import { Clipboard, closeMainWindow, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { clock } from "./format";
import { showFailure } from "./feedback";
import { findFreeTime, HoraEvent, joinConference, startFocus, stopFocus } from "./hora";

// Flows shared by the commands. Each one reports its own
// outcome and its own failures, so a caller only has to start it.

export async function joinEvent(event: HoraEvent) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Opening…" });
  try {
    await joinConference(event.id);
    await closeMainWindow();
    toast.style = Toast.Style.Success;
    toast.title = `Joining ${event.title}`;
  } catch (failure) {
    await showFailure(failure, "Could not join the meeting");
  }
}

/** `minutes` comes straight from a command argument, so it is checked here. */
export async function startFocusFlow(minutes?: string) {
  try {
    const wanted = minutes?.trim() ? Number(minutes) : undefined;
    if (wanted !== undefined && (!Number.isInteger(wanted) || wanted < 1)) {
      throw new Error("Enter the length in whole minutes, e.g. 25.");
    }
    const focus = await startFocus(wanted);
    if (!focus.started) {
      await showHUD(focus.state === "paused" ? "Focus is already paused" : "Focus is already running");
    } else if (focus.endsAt) {
      const { dateLocale } = getPreferenceValues<Preferences>();
      await showHUD(`Focus until ${clock(focus.endsAt, dateLocale)}`);
    } else {
      await showHUD("Focus started");
    }
  } catch (error) {
    await showFailure(error, "Could not start Focus");
  }
}

export async function stopFocusFlow() {
  try {
    await showHUD((await stopFocus()).stopped ? "Focus stopped" : "No Focus session to stop");
  } catch (error) {
    await showFailure(error, "Could not stop Focus");
  }
}

export async function copyAvailability(lasting: number, daysAhead: number) {
  try {
    const { slots, text } = await findFreeTime({ lasting, daysAhead });
    if (slots.length === 0) {
      await showHUD("No free time found");
      return;
    }
    await Clipboard.copy(text);
    await showHUD(`Copied ${slots.length} free ${slots.length === 1 ? "slot" : "slots"}`);
  } catch (error) {
    await showFailure(error, "Could not read your availability");
  }
}
