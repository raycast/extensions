import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { SITE_URL, WEEKLY_SITE_URL, useWeekMenu } from "./lib/api";
import { weekTableMarkdown } from "./lib/meals";

export default function Command() {
  const { data, isLoading, error, revalidate } = useWeekMenu();

  const markdown = error ? `# Couldn't load the weekly menu\n\n${error.message}` : data ? weekTableMarkdown(data) : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {data ? <Action.CopyToClipboard title="Copy Weekly Menu" content={weekTableMarkdown(data)} /> : null}
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action.OpenInBrowser title="Open Weekly Menu" url={WEEKLY_SITE_URL} />
          <Action.OpenInBrowser title="Open Today's Menu" url={SITE_URL} />
        </ActionPanel>
      }
    />
  );
}
