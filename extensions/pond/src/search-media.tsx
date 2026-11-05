import { Grid, getPreferenceValues, Icon, type LaunchProps } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import type { ApiCursor, ApiLibraryQueryInput, ApiSave } from "pond-api";
import { useMemo, useState } from "react";
import { pond } from "./api/client";
import { toError } from "./api/problems";
import { ProblemView } from "./components/problem";
import { SaveActions } from "./components/save-actions";
import { kindIcon } from "./components/save-item";
import { saveTitle, sourceName } from "./lib/display";
import { saveEditor } from "./lib/edits";
import { useQuickLook } from "./lib/files";
import { decodeFilter, encodeFilter, type Filter, queryFor } from "./lib/filters";
import { useLookups } from "./lib/library";
import { uniqueById } from "./lib/pages";
import { thumbnailKey, useThumbnails } from "./lib/thumbnails";

interface MediaPreferences {
  columns?: string;
}

const PAGE_SIZE = 60;
const NONE: ApiSave[] = [];

const TYPES = [
  { title: "Images and Videos", types: ["image", "video"] },
  { title: "Images", types: ["image"] },
  { title: "Videos", types: ["video"] },
];

function loadMedia(input: ApiLibraryQueryInput | null) {
  return async ({ cursor }: { cursor?: ApiCursor | null }) => {
    if (!input) return { data: NONE, hasMore: false };
    const page = await pond().query({ ...input, limit: PAGE_SIZE, cursor });
    return { data: page.saves ?? [], hasMore: page.nextCursor !== null, cursor: page.nextCursor };
  };
}

export default function Command(props: LaunchProps) {
  const columns = Number(getPreferenceValues<MediaPreferences>().columns) || 5;
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [stored, setStored] = useCachedState("media-filter", encodeFilter({ kind: "media", types: TYPES[0].types }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lookups = useLookups();

  const decoded = decodeFilter(stored);
  const filter: Filter = decoded.kind === "media" ? decoded : { kind: "media", types: TYPES[0].types };
  const input = queryFor(filter, searchText, []);
  const media = useCachedPromise(loadMedia, [input], { keepPreviousData: true });
  const data = useMemo(() => uniqueById(media.data ?? NONE), [media.data]);
  const thumbnails = useThumbnails(data, "medium");
  const selected = data.find((save) => save.id === selectedId) ?? data[0];
  const quickLook = useQuickLook(selected);
  const editor = useMemo(() => saveEditor(media.mutate), [media.mutate]);
  const failed = media.error && !data.length ? toError(media.error) : null;

  return (
    <Grid
      columns={columns}
      aspectRatio="1"
      fit={Grid.Fit.Fill}
      isLoading={media.isLoading}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search images and videos…"
      pagination={media.pagination}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Media Type" value={encodeFilter(filter)} onChange={setStored}>
          {TYPES.map((type) => (
            <Grid.Dropdown.Item
              key={type.title}
              title={type.title}
              value={encodeFilter({ kind: "media", types: type.types })}
            />
          ))}
        </Grid.Dropdown>
      }
    >
      {failed ? (
        <ProblemView grid error={failed} onRetry={media.revalidate} />
      ) : (
        <Grid.EmptyView
          icon={Icon.Image}
          title={searchText ? "No results found" : "No media yet"}
          description="Images and videos you save show up here."
        />
      )}
      {data.map((save) => {
        const path = thumbnails.get(thumbnailKey(save));
        return (
          <Grid.Item
            key={save.id}
            id={save.id}
            content={path ? { source: path } : kindIcon(save)}
            title={saveTitle(save)}
            subtitle={sourceName(save.source)}
            quickLook={selected?.id === save.id ? quickLook : undefined}
            actions={
              <SaveActions
                save={save}
                editor={editor}
                tags={lookups.tags}
                folders={lookups.folders}
                onRefresh={media.revalidate}
                quickLook={selected?.id === save.id ? quickLook?.path : undefined}
              />
            }
          />
        );
      })}
    </Grid>
  );
}
