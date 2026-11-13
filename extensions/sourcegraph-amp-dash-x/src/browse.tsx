import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { NewThreadForm } from "./components/new-thread-form";
import { ProjectView } from "./components/project-view";
import { liveAsThread, ThreadListItem } from "./components/thread-list-item";
import { AMP_URL, listProjects, projectSlug, searchThreads } from "./lib/amp";
import { loadSeen, markSeen, readyThreads } from "./lib/inbox";
import { useLiveThreads } from "./lib/live";
import { launch, RecoveryActions } from "./lib/ui";

/** The Amp home: what is working, what is ready for you, your projects, and thread search. */
export default function Amp() {
  const [text, setText] = useState("");
  const query = text.trim();
  const projects = useCachedPromise(listProjects, [], { keepPreviousData: true });
  const seen = useCachedPromise(loadSeen, [], { keepPreviousData: true });
  const results = useCachedPromise(searchThreads, [query], { execute: !!query, keepPreviousData: true });
  const live = useLiveThreads();
  const byID = new Map(live.map((t) => [t.id, t]));

  const working = live.filter((t) => t.working).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const ready = readyThreads(live, seen.data ?? {});
  const readyIDs = new Set(ready.map((t) => t.id));
  const refresh = () => {
    seen.revalidate();
    if (query) results.revalidate();
  };
  const goTo = (
    <ActionPanel.Section>
      <Action.Push
        title="New Thread"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<NewThreadForm navigationTitle="New Thread" />}
      />
      <Action
        title="Ask Puck"
        icon={Icon.SpeechBubble}
        shortcut={{ modifiers: ["cmd"], key: "j" }}
        onAction={() => launch("ask-puck")}
      />
      {ready.length > 0 && (
        <Action
          title="Mark All as Seen"
          icon={Icon.CheckCircle}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            await markSeen(ready.map((t) => t.id));
            seen.revalidate();
          }}
        />
      )}
    </ActionPanel.Section>
  );

  const error = projects.error ?? results.error;
  if (query) {
    const found = results.data ?? [];
    return (
      <List
        isLoading={results.isLoading}
        filtering={false}
        throttle
        searchText={text}
        onSearchTextChange={setText}
        searchBarPlaceholder="Search threads and projects…"
      >
        {error && !found.length ? (
          <List.EmptyView
            icon={Icon.Warning}
            title="Couldn't reach Amp"
            description={error.message}
            actions={<RecoveryActions onRetry={results.revalidate} />}
          />
        ) : (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="No threads found"
            description="Amp's search syntax works here: repo:, author:me, after:7d, pr:true…"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Search on Ampcode.com"
                  url={`${AMP_URL}/threads?q=${encodeURIComponent(query)}`}
                />
              </ActionPanel>
            }
          />
        )}
        <List.Section title="Projects">
          {(projects.data ?? [])
            .filter((p) => projectSlug(p).toLowerCase().includes(query.toLowerCase()))
            .map((p) => (
              <List.Item
                key={p.id}
                title={projectSlug(p)}
                subtitle={p.description}
                icon={Icon.Folder}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Project"
                      icon={Icon.ArrowRight}
                      target={<ProjectView project={p} seen={seen.data} onChange={refresh} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
        <List.Section title="Threads" subtitle={String(found.length)}>
          {found.map((t) => (
            <ThreadListItem key={t.id} thread={t} live={byID.get(t.id)} ready={readyIDs.has(t.id)} onChange={refresh} />
          ))}
        </List.Section>
      </List>
    );
  }

  return (
    <List
      isLoading={projects.isLoading}
      filtering={false}
      throttle
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search threads and projects…"
    >
      {error && !projects.data?.length ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't reach Amp"
          description={error.message}
          actions={<RecoveryActions onRetry={projects.revalidate} />}
        />
      ) : null}
      {error && projects.data?.length ? (
        // Cached projects are still listed, so say why nothing is working or ready.
        <List.Item
          title="Couldn't reach Amp"
          subtitle={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={<RecoveryActions onRetry={projects.revalidate} />}
        />
      ) : null}
      <List.Section title="Working" subtitle={working.length ? String(working.length) : undefined}>
        {working.map((t) => (
          <ThreadListItem key={t.id} thread={liveAsThread(t)} live={t} onChange={refresh}>
            {goTo}
          </ThreadListItem>
        ))}
      </List.Section>
      <List.Section title="Ready for You" subtitle={ready.length ? String(ready.length) : undefined}>
        {ready.map((t) => (
          <ThreadListItem key={t.id} thread={liveAsThread(t)} live={t} ready onChange={refresh}>
            {goTo}
          </ThreadListItem>
        ))}
      </List.Section>
      <List.Section title="Projects" subtitle={projects.data?.length ? String(projects.data.length) : undefined}>
        {(projects.data ?? []).map((p) => {
          const busy = working.filter((t) => t.project === p.name).length;
          return (
            <List.Item
              key={p.id}
              title={projectSlug(p)}
              subtitle={p.description}
              icon={Icon.Folder}
              keywords={[p.name, p.namespace]}
              accessories={[
                ...(busy ? [{ tag: { value: `${busy} working`, color: Color.Green } }] : []),
                { icon: Icon.ChevronRight },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Open Project"
                      icon={Icon.ArrowRight}
                      target={<ProjectView project={p} seen={seen.data} onChange={refresh} />}
                    />
                    <Action.Push
                      title="New Thread in Project"
                      icon={Icon.Plus}
                      shortcut={Keyboard.Shortcut.Common.New}
                      target={
                        <NewThreadForm project={projectSlug(p)} navigationTitle={`New Thread in ${projectSlug(p)}`} />
                      }
                    />
                    <Action.OpenInBrowser
                      title="Open on Ampcode.com"
                      url={`${AMP_URL}/@${projectSlug(p)}`}
                      shortcut={Keyboard.Shortcut.Common.Open}
                    />
                    <Action.CopyToClipboard title="Copy Slug" content={projectSlug(p)} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Go To">
        <List.Item
          title="New Thread"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="New Thread"
                icon={Icon.Plus}
                target={<NewThreadForm navigationTitle="New Thread" />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Ask Puck"
          icon={Icon.SpeechBubble}
          actions={
            <ActionPanel>
              <Action title="Ask Puck" icon={Icon.SpeechBubble} onAction={() => launch("ask-puck")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Portals"
          icon={Icon.Globe}
          actions={
            <ActionPanel>
              <Action title="Open Portals" icon={Icon.Globe} onAction={() => launch("open-portal")} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Prompts"
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action title="Open Prompts" icon={Icon.Document} onAction={() => launch("amp")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
