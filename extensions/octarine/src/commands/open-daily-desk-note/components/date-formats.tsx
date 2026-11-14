import { useEffect } from "react";
import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";

export function DateFormatsDetail({ onSearch }: { onSearch: () => void }) {
  useEffect(() => {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid date",
      message: "Use a supported Octarine date format",
    });
  }, []);

  return (
    <Detail
      markdown={[
        "# Supported Date Formats",
        "",
        "- ISO date: `2024-01-15`, `2024-12-25`",
        "- ISO week: `2024-W03`, `2026-W01`",
        "- Natural language dates: `today`, `yesterday`, `tomorrow`",
        "- Relative dates: `2 days ago`, `next monday`, `last friday`",
        "- Partial dates: `jan 15`, `december 25`, `nov 3`",
        "- Full dates: `jan 15 2026`, `22 Dec, 2026`",
        "- Natural language weeks: `this week`, `last week`, `next week`",
        "- Relative weeks: `2 weeks ago`, `in 2 weeks`",
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action title="Search Daily Desk Notes" icon={Icon.MagnifyingGlass} onAction={onSearch} />
        </ActionPanel>
      }
    />
  );
}
