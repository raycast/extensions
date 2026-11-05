import { environment, LaunchProps, List, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import EmailActions from "./components/EmailActions";
import { emailAccessories, rowIcon, senderTitle, subjectLine } from "./components/EmailList";
import { rowColor, useAccountColors } from "./lib/accounts";
import { avatarIcon, contactFor, useContacts } from "./lib/contacts";
import ErrorView from "./components/ErrorView";
import { positional } from "./lib/args";
import { splitQuery } from "./lib/query";
import { sparkIcon, sparkIconSVG } from "./lib/sparkIcons";
import { TIP_ICON_FILES, TipIcons, tipsSVG } from "./lib/tips";
import { sparkJSON } from "./lib/spark";
import { Address, EmailFlag, EmailsResult, SearchResult } from "./lib/types";
import { useRefreshNotice } from "./lib/ui";
import { withSparkCLI } from "./components/SparkSetup";

interface Hit {
  id: string;
  subject: string;
  from: Address[];
  to?: Address[];
  date?: string;
  flags: EmailFlag[];
  /// The receiving account or shared inbox; filter-only listings have it.
  account?: string;
  isComment?: boolean;
}

async function search(text: string, signal?: AbortSignal): Promise<{ hits: Hit[]; semantic: boolean }> {
  const { topic, filter, folder } = splitQuery(text);
  if (topic) {
    // A topic search spans every folder; `in:` only narrows filter listings.
    const args = ["search", positional(topic)];
    if (filter) args.push("--filter", filter);
    const result = await sparkJSON<SearchResult>(args, { signal });
    return {
      semantic: result.semantic_available,
      hits: result.matches
        .filter((m) => !m.outside_plan_range && m.id !== undefined)
        .map((m) => ({
          id: String(m.id),
          subject: m.subject ?? "(no subject)",
          from: m.from,
          to: m.to,
          date: m.date,
          flags: m.flags ?? [],
        })),
    };
  }
  // Operators only: list every match in the folder, or across all folders.
  const args = folder ? ["emails", folder] : ["search"];
  if (filter) args.push("--filter", filter);
  const result = await sparkJSON<EmailsResult>([...args, "--page-size", "50"], { signal });
  return {
    semantic: true,
    hits: result.emails.map((e) => ({
      id: String(e.id),
      subject: e.subject ?? "(no subject)",
      from: e.from,
      date: e.date,
      flags: e.flags,
      account: e.account,
      isComment: e.is_comment,
    })),
  };
}

function Command(props: LaunchProps<{ arguments: Arguments.SearchMail }>) {
  const [text, setText] = useState(props.arguments.query ?? props.fallbackText ?? "");
  const query = text.trim();
  const { topic, filter, folder } = splitQuery(query);
  const ready = topic.length >= 2 || filter.length > 0 || Boolean(folder);

  // A search the typing has moved past is stopped, so Spark isn't still
  // working on it when the next one starts.
  const abortable = useRef<AbortController>(null);
  const { data, isLoading, error, revalidate } = usePromise(
    (text: string) => search(text, abortable.current?.signal),
    [query],
    {
      abortable,
      execute: ready,
      onError: () => undefined,
    },
  );
  const hits = ready ? (data?.hits ?? []) : [];
  const { contacts, refresh } = useContacts(hits.map((hit) => hit.from[0]?.email ?? ""));
  const colors = useAccountColors();

  useRefreshNotice(error, hits.length > 0, revalidate);

  return (
    <List
      isLoading={isLoading}
      searchText={text}
      onSearchTextChange={setText}
      throttle
      searchBarPlaceholder="Search emails..."
    >
      {error && ready ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={query ? sparkIcon("Search", Color.SecondaryText) : { source: tipsImage() }}
          title={ready ? "No matching emails" : query ? "Keep typing" : undefined}
        />
      )}
      <List.Section
        title={ready && data && !data.semantic ? "Keyword matches (semantic search unavailable)" : undefined}
      >
        {hits.map((hit) => (
          <List.Item
            key={hit.id}
            icon={rowIcon(
              avatarIcon(hit.from[0], contactFor(contacts, hit.from[0]?.email), {
                ring: rowColor(
                  colors,
                  hit.account,
                  hit.to?.map((a) => a.email),
                ),
              }),
              hit.account ?? hit.to?.[0]?.email,
            )}
            title={senderTitle(hit.from[0])}
            subtitle={subjectLine(hit.subject, hit.flags)}
            keywords={[hit.subject, ...hit.from.map((a) => a.email)]}
            accessories={emailAccessories({
              flags: hit.flags,
              isComment: hit.isComment,
              // Topic matches carry recipients rather than the receiving account.
              date: hit.date,
            })}
            actions={
              <EmailActions
                email={{ id: hit.id, subject: hit.subject, fromEmail: hit.from[0]?.email, flags: hit.flags }}
                onChanged={revalidate}
                onRemoved={revalidate}
                sender={contactFor(contacts, hit.from[0]?.email)}
                onSenderChanged={refresh}
              />
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function tipIcons(): TipIcons {
  return Object.fromEntries(
    Object.entries(TIP_ICON_FILES).flatMap(([glyph, file]) => {
      const svg = sparkIconSVG(file);
      return svg ? [[glyph, svg]] : [];
    }),
  );
}

/// The tips panel, drawn once per appearance rather than on every keystroke.
const tipsImages = new Map<boolean, string>();
function tipsImage(): string {
  const dark = environment.appearance === "dark";
  let image = tipsImages.get(dark);
  if (!image) {
    image = tipsSVG(dark, tipIcons());
    tipsImages.set(dark, image);
  }
  return image;
}

export default withSparkCLI(Command);
