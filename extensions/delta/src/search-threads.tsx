import { Action, ActionPanel, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ChangeModelAction } from "./components/change-model-action";
import { DeltaUpdateSection } from "./components/delta-update-section";
import { DemoDataAction } from "./components/demo-data-action";
import { CreateThreadAction, ThreadActions } from "./components/thread-actions";
import { ThreadAnswer } from "./components/thread-answer";
import { ThreadListItem } from "./components/thread-list-item";
import { withDelta } from "./components/with-delta";
import { useAnswerModel } from "./hooks/use-answer-model";
import { useThreads } from "./hooks/use-threads";
import { getModelName } from "./lib/answers";
import { extractKeywords, isDeltaError } from "./lib/cli";
import { openInDelta } from "./lib/delta";
import { showDeltaFailure } from "./lib/feedback";
import {
  filterThreads,
  isAskableQuestion,
  sortThreadsNewestFirst,
  ThreadFilter,
  threadMatchesSearch,
} from "./lib/threads";

const FILTER_EMPTY_TITLES: Record<ThreadFilter, string> = {
  active: "No Active Threads",
  archived: "No Archived Threads",
  all: "No Threads Yet",
};

function SearchThreads() {
  // Each launch starts from the filter set in the command's preferences.
  const [filter, setFilter] = useState<ThreadFilter>(getPreferenceValues<Preferences.SearchThreads>().defaultFilter);
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-thread-details", true);
  const [searchText, setSearchText] = useState("");
  const threadsState = useThreads();
  const { data: threads, isLoading, error, revalidate } = threadsState;

  const visibleThreads = useMemo(
    () =>
      sortThreadsNewestFirst(
        filterThreads(threads ?? [], filter).filter((thread) => threadMatchesSearch(thread, searchText)),
      ),
    [threads, filter, searchText],
  );
  const question = searchText.trim();
  const hasNoThreads = !!error && !threads;
  // Offer to ask once there's a question; it comes last so ↵ still opens the best matching thread.
  const canAsk = isAskableQuestion(question) && !hasNoThreads;
  const toggleDetail = () => setIsShowingDetail(!isShowingDetail);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && (visibleThreads.length > 0 || canAsk)}
      searchBarPlaceholder="Search threads or ask a question"
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Threads" value={filter} onChange={(value) => setFilter(value as ThreadFilter)}>
          <List.Dropdown.Item title="Active" value="active" icon={Icon.SpeechBubble} />
          <List.Dropdown.Item title="Archived" value="archived" icon={Icon.Box} />
          <List.Dropdown.Item title="All Threads" value="all" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {hasNoThreads ? (
        <LoadErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title={searchText ? "No Matching Threads" : FILTER_EMPTY_TITLES[filter]}
          description={
            searchText
              ? "Try another search or filter."
              : "Threads you start in Delta appear here. Press ↵ to create one."
          }
          actions={
            <ActionPanel>
              <CreateThreadAction />
              <Action
                title="Refresh Threads"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
              <DemoDataAction onChange={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {/* Only on the plain list, so it never pushes search results down. */}
      {!searchText && !hasNoThreads && <DeltaUpdateSection />}
      <List.Section title="Threads" subtitle={searchText ? String(visibleThreads.length) : undefined}>
        {visibleThreads.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            isShowingDetail={isShowingDetail}
            actions={
              <ThreadActions
                thread={thread}
                threads={threadsState}
                detail={{ isShowing: isShowingDetail, onToggle: toggleDetail }}
              />
            }
          />
        ))}
      </List.Section>
      {canAsk && (
        <List.Section title="Ask">
          <AskDeltaItem question={question} isShowingDetail={isShowingDetail} onToggleDetail={toggleDetail} />
        </List.Section>
      )}
    </List>
  );
}

/** Replaces the list when threads couldn't be loaded and none are cached. */
function LoadErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isSignedOut = isDeltaError(error, "not-signed-in");
  return (
    <List.EmptyView
      icon={isSignedOut ? Icon.Person : Icon.Warning}
      title={isSignedOut ? "Sign In to Delta" : "Couldn't Load Threads"}
      description={isSignedOut ? "Open Delta, sign in to your account, then try again." : error.message}
      actions={
        <ActionPanel>
          {isSignedOut && (
            <Action
              title="Open Delta"
              icon={Icon.AppWindow}
              onAction={() => openInDelta().catch((e) => showDeltaFailure(e, "Couldn't open Delta"))}
            />
          )}
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRetry}
          />
          <DemoDataAction onChange={onRetry} />
        </ActionPanel>
      }
    />
  );
}

/** The row that sends the search text to Delta as a question about all threads. */
function AskDeltaItem(props: { question: string; isShowingDetail: boolean; onToggleDetail: () => void }) {
  const { question, isShowingDetail, onToggleDetail } = props;
  const { model } = useAnswerModel();
  const keywords = extractKeywords(question);
  const explanation =
    keywords.length > 0
      ? `Press ↵ and Delta answers from the threads that mention ${keywords.map((keyword) => `\`${keyword}\``).join(", ")}.\n\nModel: ${getModelName(model)}. Press ⌘⇧M to change it.`
      : "Delta picks the threads to read by the specific words in a question, and this one has none yet. Add a project, feature, error or file name.";

  return (
    <List.Item
      title="Ask Delta"
      subtitle={question}
      icon={Icon.Stars}
      detail={<List.Item.Detail markdown={`## ${question}\n\n${explanation}`} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Ask Delta"
            icon={Icon.Stars}
            target={<ThreadAnswer question={question} navigationTitle="Ask Delta" />}
          />
          <Action
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
          <ChangeModelAction />
          <CreateThreadAction />
        </ActionPanel>
      }
    />
  );
}

export default withDelta(SearchThreads, <List isLoading />);
