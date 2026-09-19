import { Action, ActionPanel, Detail, Icon, updateCommandMetadata } from "@raycast/api";
import { useEffect } from "react";
import { SITE_URL, WEEKLY_SITE_URL, useTodayMenu } from "./lib/api";
import { copyDayMenu, formatMenuDate, rootSubtitle, todayTableMarkdown } from "./lib/meals";

export default function Command() {
  const { data, isLoading, error, revalidate } = useTodayMenu();

  useEffect(() => {
    if (!data) {
      return;
    }
    updateCommandMetadata({ subtitle: rootSubtitle(data.meals) });
  }, [data]);

  const markdown = error ? `# Couldn't load today's menu\n\n${error.message}` : data ? todayTableMarkdown(data) : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data ? (
            <Action.CopyToClipboard
              title="Copy Today's Menu"
              content={`${formatMenuDate(data.date)}\n${copyDayMenu(data.meals)}`}
            />
          ) : null}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.OpenInBrowser title="Open Today's Menu" url={SITE_URL} />
          <Action.OpenInBrowser title="Open Weekly Menu" url={WEEKLY_SITE_URL} />
        </ActionPanel>
      }
    />
  );
}
