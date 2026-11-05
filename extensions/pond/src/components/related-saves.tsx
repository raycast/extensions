import { Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import type { ApiSave } from "pond-api";
import { useMemo, useState } from "react";
import { pond } from "../api/client";
import { toError } from "../api/problems";
import { saveTitle } from "../lib/display";
import { saveEditor } from "../lib/edits";
import { useQuickLook } from "../lib/files";
import { useLookups } from "../lib/library";
import { thumbnailKey, useThumbnails } from "../lib/thumbnails";
import { ProblemView } from "./problem";
import { SaveItem } from "./save-item";

const LIMIT = 30;
const NONE: ApiSave[] = [];

async function loadRelated(id: string) {
  return pond().related(id, LIMIT);
}

export function RelatedSaves({ save }: { save: ApiSave }) {
  const related = useCachedPromise(loadRelated, [save.id], { keepPreviousData: true });
  const [showingDetail, setShowingDetail] = useCachedState("show-detail", true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lookups = useLookups();
  const data = related.data ?? NONE;
  const icons = useThumbnails(data, "small");
  const selected = data.find((item) => item.id === selectedId) ?? data[0];
  const previews = useThumbnails(
    useMemo(() => (selected ? [selected] : []), [selected]),
    "medium",
  );
  const quickLook = useQuickLook(selected);
  const editor = useMemo(() => saveEditor(related.mutate), [related.mutate]);
  const failed = related.error && !data.length ? toError(related.error) : null;

  return (
    <List
      navigationTitle={`Related to ${saveTitle(save)}`}
      isLoading={related.isLoading}
      isShowingDetail={showingDetail && data.length > 0}
      searchBarPlaceholder="Filter related saves…"
      onSelectionChange={setSelectedId}
    >
      {failed ? (
        <ProblemView error={failed} onRetry={related.revalidate} />
      ) : (
        <List.EmptyView
          icon={Icon.Stars}
          title="No related saves"
          description="Pond finds related saves once it has read their text and images."
        />
      )}
      {data.map((item) => (
        <SaveItem
          key={item.id}
          save={item}
          editor={editor}
          lookups={lookups}
          icons={icons}
          preview={selected?.id === item.id ? previews.get(thumbnailKey(item)) : undefined}
          quickLook={selected?.id === item.id ? quickLook : undefined}
          showingDetail={showingDetail}
          onToggleDetail={() => setShowingDetail(!showingDetail)}
          onRefresh={related.revalidate}
        />
      ))}
    </List>
  );
}
