import { LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { ring } from "./alert";
import {
  formatHumanDuration,
  formatTimerName,
  normalizeName,
  parseTimerPhrase,
  upsertTimer,
  waitForTimer,
} from "./timer";

export default async function Command(props: LaunchProps<{ arguments: { when: string; name?: string } }>) {
  const input = (props.arguments.when || props.fallbackText || "").trim();
  if (!input) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Enter a time",
      message: "Try “5 minutes”, “tea 10m”, or “tomorrow at 9am”.",
    });
    return;
  }

  const now = new Date();
  const parsed = parseTimerPhrase(input, now);
  if (!parsed) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not read “${input}” as a time`,
      message: "Try “5 minutes”, “eggs in 10m”, or “standup at 3pm”.",
    });
    return;
  }

  if (!Number.isFinite(parsed.endAt) || parsed.endAt <= now.getTime()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "That time is in the past",
      message: "Use a duration or a time still ahead of now.",
    });
    return;
  }

  const name = normalizeName(props.arguments.name) || parsed.name;
  const timer = {
    id: randomUUID(),
    endAt: parsed.endAt,
    startedAt: now.getTime(),
    input,
    name,
  };
  const replaced = await upsertTimer(timer);
  const duration = formatHumanDuration(parsed.endAt - now.getTime());
  const label = formatTimerName(timer);
  const verb = replaced ? "restarted" : "started";

  await showHUD(`${label} ${verb} — ${duration}`, {
    clearRootSearch: true,
    popToRootType: PopToRootType.Immediate,
  });

  const result = await waitForTimer(timer.id);
  if (result === "stopped") {
    return;
  }

  try {
    await ring();
  } catch {
    // Sound is best-effort; the HUD still confirms the timer finished.
  }
  await showHUD(`${label} finished`);
}
