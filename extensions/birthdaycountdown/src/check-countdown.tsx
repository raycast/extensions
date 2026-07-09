import React from "react";
import { Action, ActionPanel, Detail, LaunchProps } from "@raycast/api";

type CommandArguments = {
  targetDate: string;
  repeatYearly?: string;
};

function getNextOccurrence(targetDate: Date, repeatYearly: boolean) {
  if (!repeatYearly) {
    return targetDate;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = targetDate.getMonth();
  const day = targetDate.getDate();

  let next = new Date(year, month, day);
  if (next < startOfToday()) {
    next = new Date(year + 1, month, day);
  }

  return next;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function daysRemaining(targetDate: Date) {
  const startToday = startOfToday();
  const startTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const msInDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.ceil((startTarget.getTime() - startToday.getTime()) / msInDay));
}

function formatFriendlyDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function parseDateInput(targetDate: string) {
  const parsed = new Date(targetDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRepeatYearly(input: string | undefined) {
  if (!input) {
    return true;
  }

  const normalized = input.trim().toLowerCase();
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }

  return true;
}

function CountdownResult(props: { targetDate: Date; repeatYearly: boolean }) {
  const effectiveDate = getNextOccurrence(props.targetDate, props.repeatYearly);
  const days = daysRemaining(effectiveDate);
  const isToday = days === 0;

  const title = isToday ? "It is today!" : `${days} day${days === 1 ? "" : "s"} remaining`;
  const subtitle = props.repeatYearly ? "Recurring yearly countdown" : "One-time countdown";

  const markdown = [
    "# **" + title + "**",
    "",
    `### Target Date: **${formatFriendlyDate(effectiveDate)}**`,
    "",
    isToday ? "Time to celebrate." : "Keep going. Your date is getting closer.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Mode" text={subtitle} />
          <Detail.Metadata.Label title="Selected Date" text={formatFriendlyDate(props.targetDate)} />
          <Detail.Metadata.Label title="Counting To" text={formatFriendlyDate(effectiveDate)} />
          <Detail.Metadata.Label title="Days Remaining" text={String(days)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Days Remaining" content={String(days)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { targetDate, repeatYearly } = props.arguments;
  const parsedTargetDate = parseDateInput(targetDate);

  if (!parsedTargetDate) {
    return (
      <Detail
        markdown={[
          "# **Invalid Date**",
          "",
          "Use format like **2026-12-25** for the `Target Date` argument.",
          "",
          "Example: `2027-02-14`",
        ].join("\n")}
      />
    );
  }

  return <CountdownResult targetDate={parsedTargetDate} repeatYearly={parseRepeatYearly(repeatYearly)} />;
}
