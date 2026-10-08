import { Color, Icon, Image, List } from "@raycast/api";
import { formatSeconds, secondsBetween } from "../lib/format";
import { Check, Health, QueueEntry } from "../lib/queue";

export const HEALTH_STYLE: Record<Health, { label: string; icon: Icon; color: Color }> = {
  merging: { label: "Merging", icon: Icon.ArrowRightCircle, color: Color.Purple },
  failing: { label: "Checks failed", icon: Icon.XMarkCircle, color: Color.Red },
  conflict: { label: "Merge conflict", icon: Icon.Warning, color: Color.Orange },
  running: { label: "Running checks", icon: Icon.CircleProgress50, color: Color.Yellow },
  queued: { label: "Waiting to build", icon: Icon.Circle, color: Color.SecondaryText },
  passing: { label: "Ready to merge", icon: Icon.CheckCircle, color: Color.Green },
};

function progressIcon(done: number, total: number): Icon {
  const fraction = total > 0 ? done / total : 0;
  if (fraction < 0.375) {
    return Icon.CircleProgress25;
  }
  if (fraction < 0.625) {
    return Icon.CircleProgress50;
  }
  if (fraction < 0.875) {
    return Icon.CircleProgress75;
  }
  return Icon.CircleProgress100;
}

export function entryIcon(entry: QueueEntry): Image {
  const style = HEALTH_STYLE[entry.health];
  const source = entry.health === "running" ? progressIcon(entry.requiredDone, entry.requiredTotal) : style.icon;
  return { source, tintColor: style.color };
}

export function entryStatusText(entry: QueueEntry): string {
  if (entry.health === "failing" && entry.failingRequired.length > 0) {
    return `Failing: ${entry.failingRequired.map((check) => check.name).join(", ")}`;
  }
  if (entry.health === "running") {
    return `${entry.requiredDone}/${entry.requiredTotal} required checks done`;
  }
  return HEALTH_STYLE[entry.health].label;
}

export function entryAccessories(entry: QueueEntry): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  const failingNames = entry.failingRequired.map((check) => check.name);
  const optionalNames = entry.failingOptional.map((check) => check.name);

  if (entry.health === "failing") {
    accessories.push({
      tag: {
        value:
          failingNames.length === 1
            ? failingNames[0]
            : failingNames.length
              ? `${failingNames.length} failing`
              : "Unmergeable",
        color: Color.Red,
      },
      tooltip: failingNames.length
        ? `Required checks failing:\n${failingNames.join("\n")}`
        : "GitHub marked this entry unmergeable",
    });
  } else if (entry.health === "conflict") {
    accessories.push({
      tag: { value: "Conflict", color: Color.Orange },
      tooltip: "Unmergeable with no checks, usually a merge conflict",
    });
  } else if (entry.health === "running") {
    accessories.push({ text: `${entry.requiredDone}/${entry.requiredTotal}`, tooltip: "Required checks finished" });
  }

  if (optionalNames.length > 0 && entry.health !== "failing") {
    accessories.push({
      tag: {
        value: optionalNames.length === 1 ? optionalNames[0] : `${optionalNames.length} optional failing`,
        color: Color.Orange,
      },
      tooltip: `Not required, won't block the merge:\n${optionalNames.join("\n")}`,
    });
  }

  if (entry.etaSeconds !== undefined && entry.health !== "merging") {
    accessories.push({ text: formatSeconds(entry.etaSeconds), icon: Icon.Clock, tooltip: "Estimated time to merge" });
  }

  accessories.push(
    entry.isMine
      ? { tag: { value: "You", color: Color.Blue }, tooltip: "Your pull request" }
      : {
          icon: entry.pr.avatarUrl ? { source: entry.pr.avatarUrl, mask: Image.Mask.Circle } : Icon.Person,
          tooltip: entry.pr.author,
        },
  );
  return accessories;
}

export function checkIcon(check: Check): Image {
  switch (check.state) {
    case "failure":
      return { source: Icon.XMarkCircle, tintColor: check.required ? Color.Red : Color.Orange };
    case "pending":
      return check.startedAt
        ? { source: Icon.CircleProgress50, tintColor: Color.Yellow }
        : { source: Icon.Circle, tintColor: Color.SecondaryText };
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "skipped":
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
    case "neutral":
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function checkDurationText(check: Check): string | undefined {
  if (check.state === "pending") {
    const running = secondsBetween(check.startedAt, new Date());
    return running === undefined ? "queued" : `running ${formatSeconds(running)}`;
  }
  const seconds = secondsBetween(check.startedAt, check.completedAt);
  return seconds === undefined ? undefined : formatSeconds(seconds);
}

export function checkLabel(check: Check): string {
  if (check.state === "failure") {
    return check.conclusion && check.conclusion !== "failure"
      ? `Failed (${check.conclusion.replace(/_/g, " ")})`
      : "Failed";
  }
  return { pending: "Running", success: "Passed", skipped: "Skipped", neutral: "Neutral" }[check.state];
}
