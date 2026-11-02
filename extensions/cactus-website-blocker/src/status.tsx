import { Action, ActionPanel, Color, Detail, Icon, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { cactusAppPath, CactusStatus, readStatus } from "./cactus";
import ScheduleForm from "./schedule-form";

export default function Command() {
  const [status, setStatus] = useState<CactusStatus>();
  const [error, setError] = useState<string>();

  function refresh() {
    setError(undefined);
    readStatus()
      .then(setStatus)
      .catch((value: unknown) => {
        setStatus(undefined);
        setError(message(value));
      });
  }

  useEffect(refresh, []);

  return (
    <Detail
      isLoading={!status && !error}
      markdown={error ? `# Cactus is unavailable\n\n${error}` : status ? markdown(status) : ""}
      metadata={status ? metadata(status) : null}
      actions={
        <ActionPanel>
          {status?.configuration ? (
            <Action.Push
              title="Edit Next Schedule"
              icon={Icon.Pencil}
              target={<ScheduleForm initialStatus={status} />}
            />
          ) : null}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
          <Action title="Open Cactus" icon={Icon.AppWindow} onAction={async () => open(await cactusAppPath())} />
          {error ? <Action.OpenInBrowser title="Download Cactus" url="https://usecactus.app" /> : null}
        </ActionPanel>
      }
    />
  );
}

function markdown(status: CactusStatus): string {
  const configuration = status.configuration;
  if (!configuration) return `# ${title(status.state)}\n\n${transition(status)}`;

  const note = status.isProtected
    ? "_Your current block stays unchanged when you edit the next schedule._"
    : "_Cactus applies edits when the next protected window begins._";
  return `# ${title(status.state)}\n\n${transition(status)}\n\n---\n\n${note}`;
}

function metadata(status: CactusStatus) {
  const configuration = status.configuration;
  return (
    <Detail.Metadata>
      {configuration ? (
        <>
          <Detail.Metadata.Label
            title="Schedule"
            text={formatDays(configuration.activeWeekdays)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title="Protected"
            text={`${formatMinutes(configuration.focusStartMinutes)}–${formatMinutes(configuration.accessStartMinutes)}`}
            icon={Icon.Clock}
          />
          <Detail.Metadata.TagList title="Days">
            {selectedDays(configuration.activeWeekdays).map((day) => (
              <Detail.Metadata.TagList.Item key={day} text={day} color={Color.Green} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Protected from">
            {configuration.domains.map((domain) => (
              <Detail.Metadata.TagList.Item key={domain} text={siteName(domain)} />
            ))}
          </Detail.Metadata.TagList>
        </>
      ) : null}
    </Detail.Metadata>
  );
}

function title(state: CactusStatus["state"]): string {
  switch (state) {
    case "protected":
      return "Protected now";
    case "access":
      return "Access window";
    case "attention":
      return "Protection needs attention";
    case "protectionPreserved":
      return "Protection preserved";
    case "notConfigured":
      return "Not configured";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(value),
  );
}

function transition(status: CactusStatus): string {
  if (!status.nextTransition || !status.nextTransitionKind) return "Open Cactus to finish setup.";
  return `${status.nextTransitionKind === "access" ? "Access returns" : "Protection returns"} ${formatDate(status.nextTransition)}.`;
}

function formatMinutes(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function formatDays(values = [1, 2, 3, 4, 5, 6, 7]): string {
  const selected = new Set(values);
  if (selected.size === 7) return "Every day";
  if ([2, 3, 4, 5, 6].every((value) => selected.has(value)) && selected.size === 5) return "Every weekday";
  return selectedDays(values).join(", ");
}

function selectedDays(values = [1, 2, 3, 4, 5, 6, 7]): string[] {
  const names = ["", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selected = new Set(values);
  return [2, 3, 4, 5, 6, 7, 1].filter((value) => selected.has(value)).map((value) => names[value]);
}

function siteName(domain: string): string {
  if (domain === "youtube.com") return "YouTube";
  if (domain === "x.com") return "X";
  if (domain === "reddit.com") return "Reddit";
  return domain;
}

function message(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
