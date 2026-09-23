import { Action, ActionPanel, Detail, Icon, showToast, Toast, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { buildNameMarkdown, NameMetadata } from "./name-detail-content";
import { SaveActions } from "./save-actions";
import { SessionMatches } from "./session-matches";
import { castVote, loadMoreNames, type FavoriteList, type SessionNamesResponse } from "./lib/api";
import { type Name } from "./lib/types";

// Fetch more candidate names once the unseen queue drops to this length.
const REFILL_THRESHOLD = 5;

/** Vote on one name at a time (keyboard/action-driven, no swipe). */
export function SessionVoting({
  sessionId,
  baseUrl,
  apiKey,
  lists,
}: {
  sessionId: string;
  baseUrl: string;
  apiKey: string;
  lists: FavoriteList[];
}) {
  const { data, isLoading, error } = useFetch<SessionNamesResponse>(`${baseUrl}/api/sessions/${sessionId}/names`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
  });

  const [queue, setQueue] = useState<Name[]>([]);
  const [index, setIndex] = useState(0);
  const refillingRef = useRef(false);

  // Seed the queue from the initial fetch.
  useEffect(() => {
    if (data?.names) setQueue(data.names);
  }, [data]);

  const current: Name | undefined = queue[index];

  async function vote(choice: "like" | "dislike") {
    if (!current) return;
    const result = await castVote(baseUrl, apiKey, sessionId, current.id, choice);
    if (!result) return; // failed — stay on this name (toast already shown)

    if (result.isMatch) {
      await showToast({ style: Toast.Style.Success, title: "🎉 It's a Match!", message: current.name });
    }

    const next = index + 1;
    setIndex(next);

    // Refill the queue when running low.
    if (queue.length - next <= REFILL_THRESHOLD && !refillingRef.current) {
      refillingRef.current = true;
      const more = await loadMoreNames(baseUrl, apiKey, sessionId);
      refillingRef.current = false;
      // Always spread into a new array so an empty refill still triggers a re-render.
      setQueue((q) => [...q, ...more]);
    }
  }

  const matchesAction = (
    <Action.Push
      title="View Matches"
      icon={Icon.Stars}
      target={<SessionMatches sessionId={sessionId} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />}
    />
  );

  if (!current) {
    let markdown = "";
    if (error) {
      markdown = `# Couldn't load names\n\n${error.message}\n\nIf your API key is invalid or expired, check the API Key in this extension's preferences.`;
    } else if (!isLoading && !refillingRef.current) {
      markdown =
        "# All caught up! 🎉\n\nYou've voted on every available name for this session's filters. Check your matches, or come back later for more.";
    }
    return (
      <Detail
        isLoading={isLoading || refillingRef.current}
        navigationTitle="Naming Session"
        markdown={markdown}
        actions={<ActionPanel>{matchesAction}</ActionPanel>}
      />
    );
  }

  const slug = encodeURIComponent(current.name.toLowerCase());

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Vote — ${current.name}`}
      markdown={buildNameMarkdown(current)}
      metadata={<NameMetadata nameData={current} baseUrl={baseUrl} />}
      actions={
        <ActionPanel>
          <Action title="Like" icon={Icon.Heart} onAction={() => vote("like")} />
          <Action
            title="Dislike"
            icon={Icon.HeartDisabled}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => vote("dislike")}
          />
          <SaveActions nameId={current.id} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />
          <ActionPanel.Section>
            {matchesAction}
            <Action.OpenInBrowser title="Open in Browser" url={`${baseUrl}/name/${slug}`} />
            <Action.CopyToClipboard title="Copy Name" content={current.name} shortcut={Keyboard.Shortcut.Common.Pin} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
