import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs";
import { useEffect, useMemo, useState } from "react";
import {
  CAPTURE_PENDING_FILE,
  clearPendingCapture,
  fileUrlForLocalPath,
  readPendingCapture,
  type PendingCapture,
} from "./lib/capture-handoff";
import {
  collectionPathName,
  enqueueCapture,
  filterCollections,
  findDuplicateLink,
  SATURN_APP_URL,
  sortCollections,
  type SaturnCollection,
  useSaturnLibrary,
} from "./lib/saturn";

function parseTagsField(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean);
}

/** Live-reads capture-pending.json so the screenshot can appear after open. */
function usePendingCapture(): PendingCapture | null {
  const [pending, setPending] = useState<PendingCapture | null>(() =>
    readPendingCapture(),
  );

  useEffect(() => {
    setPending(readPendingCapture());

    let debounce: NodeJS.Timeout | null = null;
    let watcher: fs.FSWatcher | null = null;
    try {
      watcher = fs.watch(CAPTURE_PENDING_FILE, { persistent: false }, () => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => setPending(readPendingCapture()), 80);
      });
    } catch {
      // File may not exist yet — poll briefly in case Saturn writes it late.
    }

    const poll = setInterval(() => {
      const next = readPendingCapture();
      setPending((prev) => {
        if (!next && !prev) return prev;
        if (
          next?.previewImagePath === prev?.previewImagePath &&
          next?.candidate.payload === prev?.candidate.payload &&
          next?.capturedAt === prev?.capturedAt
        ) {
          return prev;
        }
        return next;
      });
    }, 400);

    return () => {
      watcher?.close();
      if (debounce) clearTimeout(debounce);
      clearInterval(poll);
    };
  }, []);

  return pending;
}

function previewMarkdown(capture: PendingCapture): string {
  if (capture.previewImagePath) {
    return `![](${fileUrlForLocalPath(capture.previewImagePath)}?raycast-height=420)`;
  }
  return "_Capturing page preview…_";
}

function saveCaptureWithCollectionName(
  capture: PendingCapture,
  collectionName: string,
  extras?: {
    title?: string;
    tags?: string[];
    company?: string;
    description?: string;
  },
) {
  const candidate = capture.candidate;
  const name = collectionName.trim();
  enqueueCapture({
    type: "link",
    payload: candidate.payload,
    title: extras?.title?.trim() || candidate.title,
    sourceApp: candidate.sourceApp,
    sourceUrl: candidate.sourceUrl ?? candidate.payload,
    capturedAt: capture.capturedAt,
    collectionName: name,
    tags: extras?.tags,
    company: extras?.company,
    description: extras?.description,
    previewImagePath: capture.previewImagePath,
  });
  clearPendingCapture();
  showToast({
    style: Toast.Style.Success,
    title: "Saved to Saturn",
    message: name,
  });
  popToRoot();
}

function saveCapture(
  capture: PendingCapture,
  collection: SaturnCollection,
  collections: SaturnCollection[],
  extras?: {
    title?: string;
    tags?: string[];
    company?: string;
    description?: string;
  },
) {
  saveCaptureWithCollectionName(
    capture,
    collectionPathName(collection, collections),
    extras,
  );
}

function PendingCaptureForm({
  capture: initial,
  initialCollectionId,
}: {
  capture: PendingCapture;
  initialCollectionId?: string;
}) {
  // Prefer live handoff so a late screenshot is still attached on submit.
  const live = usePendingCapture();
  const capture =
    live?.candidate.payload === initial.candidate.payload ? live : initial;
  const { library, isLoading } = useSaturnLibrary();
  const collections = useMemo(
    () => sortCollections(library.collections),
    [library.collections],
  );
  const [collectionId, setCollectionId] = useState(initialCollectionId ?? "");

  useEffect(() => {
    if (collections.length === 0 || collectionId) return;
    const inbox = collections.find((c) => c.isInbox);
    setCollectionId(inbox?.id ?? collections[0].id);
  }, [collections, collectionId]);

  const selected = collections.find((c) => c.id === collectionId);
  const candidate = capture.candidate;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Details"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save to Saturn"
            icon={Icon.Bookmark}
            onSubmit={(values: {
              title: string;
              tags: string;
              company: string;
              description: string;
            }) => {
              if (!selected) return;
              saveCapture(capture, selected, collections, {
                title: values.title,
                tags: parseTagsField(values.tags),
                company: values.company.trim() || undefined,
                description: values.description.trim() || undefined,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="URL" text={candidate.payload} />

      <Form.TextField
        id="title"
        title="Title"
        defaultValue={candidate.title ?? ""}
        placeholder={candidate.payload}
      />

      <Form.Dropdown
        id="collection"
        title="Collection"
        value={collectionId}
        onChange={setCollectionId}
      >
        {collections.map((c) => (
          <Form.Dropdown.Item
            key={c.id}
            value={c.id}
            title={collectionPathName(c, collections)}
            icon={c.isInbox ? Icon.Tray : Icon.Folder}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="design, inspiration"
      />
      <Form.TextField id="company" title="Company" placeholder="Optional" />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional note about this bookmark"
      />
    </Form>
  );
}

/** Searchable collection list + capture preview in the detail pane. */
function PendingCapturePicker({
  capture: initial,
}: {
  capture: PendingCapture;
}) {
  const live = usePendingCapture();
  const capture =
    live?.candidate.payload === initial.candidate.payload ? live : initial;
  const { library, isLoading } = useSaturnLibrary();
  const collections = useMemo(
    () => sortCollections(library.collections),
    [library.collections],
  );
  const [searchText, setSearchText] = useState("");
  const { matches, exactMatch } = useMemo(
    () => filterCollections(searchText, collections),
    [searchText, collections],
  );
  const trimmedQuery = searchText.trim();
  const showCreateRow = trimmedQuery.length > 0 && !exactMatch;
  const candidate = capture.candidate;

  const duplicate =
    candidate.type === "link"
      ? findDuplicateLink(library.links, candidate.payload)
      : undefined;
  const duplicateCollection = duplicate
    ? library.collections.find((c) => c.id === duplicate.collectionId)
    : undefined;
  const duplicatePath = duplicateCollection
    ? collectionPathName(duplicateCollection, collections)
    : undefined;

  const detail = (
    <List.Item.Detail
      markdown={previewMarkdown(capture)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link
            title="URL"
            target={candidate.payload}
            text={candidate.payload}
          />
          {candidate.title ? (
            <List.Item.Detail.Metadata.Label
              title="Title"
              text={candidate.title}
            />
          ) : null}
          {candidate.sourceApp ? (
            <List.Item.Detail.Metadata.Label
              title="Source"
              text={candidate.sourceApp}
            />
          ) : null}
          {duplicatePath ? (
            <List.Item.Detail.Metadata.Label
              title="Already saved"
              text={duplicatePath}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Saturn"
            target={SATURN_APP_URL}
            text="glaze.app/app/saturn"
          />
        </List.Item.Detail.Metadata>
      }
    />
  );

  const hasResults = matches.length > 0 || showCreateRow;

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      isShowingDetail={hasResults}
      navigationTitle="Save to Saturn"
      searchBarPlaceholder="Search collections…"
      onSearchTextChange={setSearchText}
    >
      {collections.length === 0 && !showCreateRow ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No collections yet"
          description="Type a collection name to create one, or open Saturn once so it can create your library."
        />
      ) : (
        <>
          {showCreateRow ? (
            <List.Item
              key="__create__"
              icon={Icon.Plus}
              title={`Create “${trimmedQuery}”`}
              detail={detail}
              actions={
                <ActionPanel>
                  <Action
                    title="Save to Saturn"
                    icon={Icon.Bookmark}
                    onAction={() =>
                      saveCaptureWithCollectionName(capture, trimmedQuery)
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open Saturn App"
                    icon={Icon.Globe}
                    url={SATURN_APP_URL}
                  />
                </ActionPanel>
              }
            />
          ) : null}
          {matches.map((collection) => {
            const pathName = collectionPathName(collection, collections);
            return (
              <List.Item
                key={collection.id}
                icon={collection.isInbox ? Icon.Tray : Icon.Folder}
                title={{ value: pathName, tooltip: pathName }}
                detail={detail}
                actions={
                  <ActionPanel>
                    <Action
                      title="Save to Saturn"
                      icon={Icon.Bookmark}
                      onAction={() =>
                        saveCapture(capture, collection, collections)
                      }
                    />
                    <Action.Push
                      title="Add Details…"
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      target={
                        <PendingCaptureForm
                          capture={capture}
                          initialCollectionId={collection.id}
                        />
                      }
                    />
                    <Action.OpenInBrowser
                      title="Open Saturn App"
                      icon={Icon.Globe}
                      url={SATURN_APP_URL}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </>
      )}
    </List>
  );
}

export default function SaveLink() {
  const pending = usePendingCapture();

  if (pending?.candidate.type === "link") {
    return <PendingCapturePicker capture={pending} />;
  }

  return (
    <List navigationTitle="Save to Saturn">
      <List.EmptyView
        icon={Icon.Globe}
        title="No browser page captured"
        description="Press ⌘B while a webpage is frontmost in Chrome, Safari, Arc, etc. Raycast opens with your collections and page preview so you can save it to Saturn."
      />
    </List>
  );
}
