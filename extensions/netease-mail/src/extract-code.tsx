import { Action, ActionPanel, Clipboard, Icon, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { SetupGuide } from "./components/setup-guide.js";
import { extractBestCodeOrLink } from "./lib/code-extraction.js";
import { formatRelativeDate } from "./lib/date.js";
import { fetchRecentMail, MailMessage } from "./lib/mail-client.js";
import { hasMailCredentials } from "./lib/preferences.js";

type CodeResult = {
  id: string;
  value: string;
  kind: "code" | "link";
  label: string;
  message: MailMessage;
};

export default function Command() {
  if (!hasMailCredentials()) {
    return <SetupGuide />;
  }

  const { data, isLoading, error, revalidate } = useCachedPromise(loadCodeResults, [], {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter codes, links, senders, or subjects...">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not extract codes"
          description={error instanceof Error ? error.message : String(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : null}
      {data?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Key}
          title="No recent codes found"
          description="Checked mail from the last 30 minutes."
        />
      ) : null}
      {data?.map((result) => (
        <List.Item
          key={result.id}
          icon={result.kind === "code" ? Icon.Key : Icon.Link}
          title={result.value}
          subtitle={`${result.message.subject} · ${result.message.from}`}
          accessories={[{ text: result.label }, { text: formatRelativeDate(result.message.date) }]}
          actions={
            <ActionPanel>
              <Action
                title={result.kind === "code" ? "Copy Code" : "Copy Link"}
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(result.value);
                  await showHUD(result.kind === "code" ? "Code copied" : "Link copied");
                }}
              />
              <Action.CopyToClipboard title="Copy Mail Summary" content={toSummary(result)} />
              {result.kind === "link" ? (
                <Action.OpenInBrowser title="Open Link" url={result.value} icon={Icon.Globe} />
              ) : null}
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function loadCodeResults(): Promise<CodeResult[]> {
  const messages = await fetchRecentMail(30, 30);
  return messages.flatMap((message) => {
    const item = extractBestCodeOrLink(`${message.subject}\n${message.snippet}\n${message.text}`);

    return item
      ? [
          {
            id: `${message.uid}-${item.value}`,
            value: item.value,
            kind: item.kind,
            label: item.label,
            message,
          },
        ]
      : [];
  });
}

function toSummary(result: CodeResult): string {
  return [
    `${result.label}: ${result.value}`,
    `From: ${result.message.from}`,
    `Subject: ${result.message.subject}`,
  ].join("\n");
}
