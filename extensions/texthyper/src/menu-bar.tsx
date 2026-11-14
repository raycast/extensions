import { Color, getPreferenceValues, Icon, MenuBarExtra, open, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { articleUrl, getMe, getSession, server, updateArticle } from "./lib/api";
import { currentLibrary } from "./lib/library";
import { continueReading, displayTitle, inProgress, minutesLeft, newestUnread, readingTime } from "./lib/logic";
import type { Article } from "./lib/types";
import { run } from "./lib/no-view";
import { articleIcon } from "./lib/views";

type Summary = { signedIn: boolean; unread: number; started: Article[]; latest: Article[] };

// Raycast runs this every ten minutes in the background and whenever the
// menu is opened; the last answer shows in between.
async function summarize(): Promise<Summary> {
  if (!(await getSession())) return { signedIn: false, unread: 0, started: [], latest: [] };

  const [library, me] = await Promise.all([currentLibrary(), getMe().catch(() => undefined)]);
  const articles = Object.values(library.articles);
  const started = continueReading(articles).slice(0, 3);
  const shown = new Set(started.map((article) => article.id));
  const unread = newestUnread(articles);
  return {
    signedIn: true,
    unread: me?.counts.unread ?? unread.length,
    started,
    latest: unread.filter((article) => !shown.has(article.id)).slice(0, 5),
  };
}

export default function MenuBar() {
  const { showCount } = getPreferenceValues<Preferences.MenuBar>();
  const { data, isLoading, mutate } = useCachedPromise(summarize, [], {
    keepPreviousData: true,
    onError: () => {},
  });
  const start = (name: string) => () => run(name);

  async function archive(article: Article) {
    // Awaited to the end: Raycast unloads a menu bar command that has
    // nothing pending.
    try {
      await mutate(updateArticle(article.id, { archived: true }), {
        optimisticUpdate: (summary) =>
          summary && {
            ...summary,
            unread: Math.max(0, summary.unread - 1),
            started: summary.started.filter((item) => item.id !== article.id),
            latest: summary.latest.filter((item) => item.id !== article.id),
          },
      });
      await showHUD("Archived");
    } catch {
      await showHUD("Could not archive that");
    }
  }

  const item = (article: Article) => (
    <MenuBarExtra.Item
      key={article.id}
      icon={articleIcon(article)}
      title={truncate(displayTitle(article))}
      subtitle={subtitle(article)}
      tooltip="Click to read, Option-click to archive"
      onAction={() => open(articleUrl(article))}
      alternate={
        <MenuBarExtra.Item
          icon={Icon.Tray}
          title={`Archive "${truncate(displayTitle(article), 40)}"`}
          onAction={() => archive(article)}
        />
      }
    />
  );

  return (
    <MenuBarExtra
      icon={{ source: "menu-bar.png", tintColor: Color.PrimaryText }}
      title={showCount && data?.signedIn && data.unread > 0 ? String(data.unread) : undefined}
      tooltip="Texthyper"
      isLoading={isLoading}
    >
      {data && !data.signedIn && (
        <MenuBarExtra.Item icon={Icon.Key} title="Sign In to Texthyper" onAction={start("account")} />
      )}
      {!data && (
        <>
          <MenuBarExtra.Item title={isLoading ? "Loading…" : "Could not reach Texthyper"} />
          <MenuBarExtra.Item icon={Icon.List} title="Open Library" onAction={start("library")} />
        </>
      )}
      {data?.signedIn && (
        <>
          {data.started.length > 0 && (
            <MenuBarExtra.Section title="Continue Reading">{data.started.map(item)}</MenuBarExtra.Section>
          )}
          <MenuBarExtra.Section title={data.unread > 0 ? `Unread · ${data.unread}` : "Unread"}>
            {data.latest.map(item)}
            {data.started.length + data.latest.length === 0 && <MenuBarExtra.Item title="Nothing left to read" />}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item icon={Icon.Shuffle} title="Read Next" onAction={start("read-next")} />
            <MenuBarExtra.Item icon={Icon.Plus} title="Save Current Page" onAction={start("save")} />
            <MenuBarExtra.Item icon={Icon.List} title="Open Library" onAction={start("library")} />
            <MenuBarExtra.Item icon={Icon.Globe} title="Open Texthyper" onAction={() => open(server())} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}

function subtitle(article: Article): string {
  const time = readingTime(minutesLeft(article));
  return inProgress(article) ? `${time} left` : time;
}

function truncate(text: string, length = 60): string {
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}
