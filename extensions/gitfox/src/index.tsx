import { Detail } from "@raycast/api";
import BookmarkList from "./components/bookmark-list";
import { isGitfoxCliInstalled, gitfoxCliRequiredMessage } from "./utils";
import { useBookmarks } from "./hooks/use-bookmarks";
import { usePinnedRepos } from "./hooks/use-pinned-repos";
import { useRecentRepos } from "./hooks/use-recent-repos";
import { useBatchGitStatus } from "./hooks/use-batch-git-status";
import { useMemo } from "react";

export default function Command() {
  const { data: groups = [], isLoading } = useBookmarks();
  const { pinnedIds, togglePin, isPinned } = usePinnedRepos();
  const { recentIds, recordOpen, clearRecent } = useRecentRepos();

  const allBookmarks = useMemo(() => groups.flatMap((g) => g.bookmarks), [groups]);
  const gitStatusMap = useBatchGitStatus(allBookmarks);

  if (!isGitfoxCliInstalled()) {
    return <Detail navigationTitle="GitFox CLI not configured" markdown={gitfoxCliRequiredMessage()} />;
  }

  return (
    <BookmarkList
      groups={groups}
      isLoading={isLoading}
      pinnedIds={pinnedIds}
      recentIds={recentIds}
      isPinned={isPinned}
      onTogglePin={togglePin}
      onOpen={recordOpen}
      onClearRecent={clearRecent}
      gitStatusMap={gitStatusMap}
    />
  );
}
