import { showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { useEffect, useState } from "react";
import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { CommitItem, useSidebar } from "./components/profile";
import { searchCommits } from "./lib/api";

const log = (message: string, data?: Record<string, unknown>) => logger.log(message, data);

// The server allows 15 commit searches a minute, so a search waits until typing pauses.
const TYPING_PAUSE_MS = 800;
// The server answers nothing for fewer characters (CommitSearchQuery::MINIMUM_TERM_LENGTH), so don't spend a search.
const MINIMUM_TERM_LENGTH = 3;

export default function Command() {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const sidebar = useSidebar("search-commits");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // Counted in code points, as the server counts.
  const searchable = [...term].length >= MINIMUM_TERM_LENGTH;
  const { data, isLoading, error } = useCachedPromise((query: string) => searchCommits(query, log), [term], {
    execute: searchable,
    keepPreviousData: true,
    onError: (error) => void showError(error, { title: "Couldn't Search Commits" }),
  });
  // A failed search keeps the last one's results in `data`; they don't belong under this search.
  const failed = error !== undefined && !isLoading;
  const results = searchable && !failed ? (data ?? []) : [];

  return (
    <List
      isLoading={isLoading || text.trim() !== term}
      isShowingDetail={results.length > 0 && sidebar.show}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder="Search commits"
    >
      {!searchable ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search commits on /dev/null"
          description={`Type at least ${MINIMUM_TERM_LENGTH} characters.`}
        />
      ) : failed ? (
        <List.EmptyView icon={Icon.Warning} title="Couldn't search commits" description={error.message} />
      ) : (
        <>
          {!isLoading && text.trim() === term && (
            <List.EmptyView icon={Icon.Message} title={`No commits match “${term}”`} />
          )}
          {results.map((commit) => (
            <CommitItem key={commit.id} commit={commit} showAuthor sidebarAction={sidebar.action} />
          ))}
        </>
      )}
    </List>
  );
}
