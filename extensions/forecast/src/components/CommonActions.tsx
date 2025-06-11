import { Action, ActionPanel, Icon } from "@raycast/api";
import dayjs from "dayjs";
import React from "react";
import { ForecastEntry } from "../types";

interface CommonActionsProps {
  showDetails: boolean;
  setShowDetails: React.Dispatch<React.SetStateAction<boolean>>;
  webUrl: string;
  viewDate: Date;
  changeViewDate: (date: Date) => void;
  entry?: ForecastEntry;
  toggleDone?: (id: number) => void;
}

export function CommonActions({
  showDetails,
  setShowDetails,
  webUrl,
  viewDate,
  changeViewDate,
  entry,
  toggleDone,
}: CommonActionsProps) {
  return (
    <>
      <Action
        title={showDetails ? "Hide Details" : "Show Details"}
        icon={Icon.AppWindowSidebarLeft}
        onAction={() => setShowDetails((prev) => !prev)}
      />

      {entry && toggleDone && (
        <ActionPanel.Section>
          <Action
            title={entry.isDone ? "Mark as Not Done" : "Mark as Done"}
            icon={entry.isDone ? Icon.XMarkCircle : Icon.Checkmark}
            onAction={() => toggleDone(entry.id)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          {entry.urls
            .filter((url) => url.linearId)
            .map((url, i) => (
              <Action.Open
                key={`linear-${i}`}
                title={`Open in Linear (${url.linearId})`}
                icon="linear.png"
                target={`https://linear.app/simplygoodwork/issue/${url.linearId}`}
                shortcut={i === 0 ? { modifiers: ["cmd"], key: "l" } : undefined}
              />
            ))}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action
          title="Next Day"
          icon={Icon.ArrowRight}
          onAction={() => changeViewDate(dayjs(viewDate).add(1, "day").toDate())}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
        />
        <Action
          title="Previous Day"
          icon={Icon.ArrowLeft}
          onAction={() => changeViewDate(dayjs(viewDate).subtract(1, "day").toDate())}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
        />
        <Action
          title="Go to Today"
          icon={Icon.Calendar}
          onAction={() => changeViewDate(new Date())}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
        />
      </ActionPanel.Section>

      <Action.OpenInBrowser title="Open on Web" url={webUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
    </>
  );
}
