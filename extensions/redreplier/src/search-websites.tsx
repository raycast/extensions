import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { AddKeywordsForm } from "./components/add-keywords-form";
import { LoadErrorView } from "./components/load-error-view";
import { api } from "./lib/api";
import { APP_URL } from "./lib/client";
import { runWithToast } from "./lib/feedback";
import { activeKeywordCount, KEYWORD_STATUS_LABELS, websiteName } from "./lib/format";
import { Keyword, KeywordStatus, Website } from "./lib/types";
import { useWebsites } from "./lib/use-websites";

const KEYWORDS_URL = `${APP_URL}/keywords`;

const KEYWORD_STATUS_COLORS: Record<KeywordStatus, Color> = {
  ACTIVE: Color.Green,
  PENDING: Color.Yellow,
  DISABLED: Color.SecondaryText,
  SUSPENDED: Color.Red,
};

type KeywordListProps = {
  websiteId: string;
};

function KeywordList({ websiteId }: KeywordListProps) {
  const { data: websites, isLoading, error, revalidate } = useWebsites();
  const website = websites?.find((item) => item.id === websiteId);

  const setEnabled = async (keyword: Keyword, enabled: boolean) => {
    await runWithToast(
      enabled
        ? { pending: "Turning Keyword On", success: "Keyword On", failure: "Could Not Turn Keyword On" }
        : { pending: "Turning Keyword Off", success: "Keyword Off", failure: "Could Not Turn Keyword Off" },
      () => (enabled ? api().enableKeyword(keyword.id) : api().disableKeyword(keyword.id)),
    );
    revalidate();
  };

  const addKeywordsAction = (
    <Action.Push
      title="Add Keywords"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddKeywordsForm websiteId={websiteId} onAdded={revalidate} popAfterAdd />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={website ? websiteName(website) : "Keywords"}
      searchBarPlaceholder="Search keywords"
    >
      {error && !websites ? (
        <LoadErrorView title="Could Not Load Websites" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Tag}
          title="No Keywords Yet"
          actions={<ActionPanel>{addKeywordsAction}</ActionPanel>}
        />
      )}
      {website?.keywords.map((keyword) => (
        <List.Item
          key={keyword.id}
          title={keyword.value}
          icon={Icon.Tag}
          accessories={[
            { tag: { value: KEYWORD_STATUS_LABELS[keyword.status], color: KEYWORD_STATUS_COLORS[keyword.status] } },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.OpenInBrowser title="Open Keywords" url={KEYWORDS_URL} />
                <Action.CopyToClipboard title="Copy Keyword" content={keyword.value} />
              </ActionPanel.Section>
              <ActionPanel.Section>
                {keyword.status === "ACTIVE" && (
                  <Action title="Turn Keyword off" icon={Icon.Pause} onAction={() => setEnabled(keyword, false)} />
                )}
                {keyword.status === "DISABLED" && (
                  <Action title="Turn Keyword on" icon={Icon.Play} onAction={() => setEnabled(keyword, true)} />
                )}
                {addKeywordsAction}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function websiteSubtitle(website: Website): string | undefined {
  return website.name ? website.domain : undefined;
}

export default function Command() {
  const { data: websites, isLoading, error, revalidate } = useWebsites();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search websites">
      {error && !websites ? (
        <LoadErrorView title="Could Not Load Websites" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Websites Found"
          description="Add a website in RedReplier to start monitoring."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open RedReplier" url={`${APP_URL}/dashboard`} />
            </ActionPanel>
          }
        />
      )}
      {websites?.map((website) => (
        <List.Item
          key={website.id}
          title={websiteName(website)}
          subtitle={websiteSubtitle(website)}
          keywords={[website.domain]}
          icon={Icon.Globe}
          accessories={[{ text: `${activeKeywordCount(website)} of ${website.keywords.length} keywords on` }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Keywords" icon={Icon.Tag} target={<KeywordList websiteId={website.id} />} />
              <Action.Push
                title="Add Keywords"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<AddKeywordsForm websiteId={website.id} onAdded={revalidate} popAfterAdd />}
              />
              <Action.OpenInBrowser title="Open Website" url={website.url} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
