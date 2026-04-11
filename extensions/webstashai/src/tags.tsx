import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  getTagJob,
  handleApiError,
  listPages,
  listTags,
  mergeTag,
  renameTag,
} from "./api/client";
import PageListItem from "./components/PageListItem";
import { isValidApiKey } from "./helpers/utils";
import {
  getCacheAgeLabel,
  getInitialTags,
  setCachedTags,
} from "./shared-cache";
import type { TagIndexEntry, TagIndexResponse, TagRenameResult } from "./types";

// ── Tag kind helpers ────────────────────────────────────────────

type TagKind = "primary" | "secondary" | "user";

function tagKindIcon(kind: TagKind): Icon {
  switch (kind) {
    case "primary":
      return Icon.Tag;
    case "secondary":
      return Icon.Tag;
    case "user":
      return Icon.Hashtag;
  }
}

function tagKindColor(kind: TagKind): Color {
  switch (kind) {
    case "primary":
      return Color.Blue;
    case "secondary":
      return Color.Orange;
    case "user":
      return Color.Green;
  }
}

function tagKindLabel(kind: TagKind): string {
  switch (kind) {
    case "primary":
      return "Primary Tags";
    case "secondary":
      return "Secondary Tags";
    case "user":
      return "User Tags";
  }
}

// ── Main command ────────────────────────────────────────────────

export default function BrowseTagsCommand() {
  const apiKey = getPreferenceValues<Preferences>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return (
      <List>
        <List.EmptyView
          title="Invalid API Key"
          description="Your API key must start with 'wsk_'. Open extension preferences to update it."
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  const initialTags = getInitialTags();

  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const result = await listTags();
      setCachedTags(result);
      return result;
    },
    [],
    {
      initialData: initialTags ?? undefined,
      keepPreviousData: true,
      onError: async (error) => {
        const handled = await handleApiError(error);
        if (!handled) await showFailureToast("Failed to load tags");
      },
    },
  );

  const cacheLabel = getCacheAgeLabel();

  const sections: { kind: TagKind; tags: TagIndexEntry[] }[] = data
    ? [
        { kind: "primary", tags: data.primary_tags ?? [] },
        { kind: "secondary", tags: data.secondary_tags ?? [] },
        { kind: "user", tags: data.user_tags ?? [] },
      ]
    : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tags..."
      navigationTitle={cacheLabel ?? "Browse Tags"}
    >
      <List.EmptyView
        title="No Tags Found"
        description="Your library has no tags yet. Tags are generated automatically when pages are indexed."
        icon={Icon.Tag}
      />
      {sections.map(
        ({ kind, tags }) =>
          tags.length > 0 && (
            <List.Section
              key={kind}
              title={tagKindLabel(kind)}
              subtitle={`${tags.length} tags`}
            >
              {tags.map((entry) => (
                <TagListItem
                  key={`${kind}:${entry.tag}`}
                  entry={entry}
                  kind={kind}
                  allTags={data}
                  onTagsChanged={revalidate}
                />
              ))}
            </List.Section>
          ),
      )}
    </List>
  );
}

// ── Tag list item ───────────────────────────────────────────────

function TagListItem({
  entry,
  kind,
  allTags,
  onTagsChanged,
}: {
  entry: TagIndexEntry;
  kind: TagKind;
  allTags: TagIndexResponse | undefined;
  onTagsChanged: () => void;
}) {
  return (
    <List.Item
      id={`${kind}:${entry.tag}`}
      title={entry.tag}
      icon={{ source: tagKindIcon(kind), tintColor: tagKindColor(kind) }}
      accessories={[
        {
          text: `${entry.count} ${entry.count === 1 ? "page" : "pages"}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Browse">
            <Action.Push
              title="View Pages with This Tag"
              icon={Icon.List}
              target={<TagPagesView tag={entry.tag} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Rename Tag"
              icon={Icon.Pencil}
              target={
                <RenameTagForm oldTag={entry.tag} onComplete={onTagsChanged} />
              }
            />
            <Action.Push
              title="Merge into Another Tag"
              icon={Icon.ArrowRight}
              target={
                <MergeTagForm
                  sourceTag={entry.tag}
                  allTags={allTags}
                  onComplete={onTagsChanged}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Tag Name" content={entry.tag} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ── Tag pages view (pushed from selecting a tag) ────────────────

function TagPagesView({ tag }: { tag: string }) {
  const { data, isLoading, pagination } = useCachedPromise(
    (tagName: string) => async (options: { cursor?: string }) => {
      const result = await listPages({
        cursor: options.cursor,
        tag: tagName,
      });
      return {
        data: result.pages,
        hasMore: result.has_more,
        cursor: result.next_cursor ?? undefined,
      };
    },
    [tag],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`Tag: ${tag}`}
      searchBarPlaceholder={`Filter pages tagged "${tag}"...`}
    >
      <List.EmptyView
        title="No Pages Found"
        description={`No pages are tagged with "${tag}"`}
        icon={Icon.Tag}
      />
      {(data ?? []).map((page) => (
        <PageListItem key={page.id} page={page} />
      ))}
    </List>
  );
}

// ── Rename Tag form ─────────────────────────────────────────────

function RenameTagForm({
  oldTag,
  onComplete,
}: {
  oldTag: string;
  onComplete: () => void;
}) {
  const { pop } = useNavigation();
  const [newTag, setNewTag] = useState("");
  const [dryRunInfo, setDryRunInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDryRun() {
    if (!newTag.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await renameTag(
        { old_tag: oldTag, new_tag: newTag.trim().toLowerCase() },
        true,
      );
      const syncResult = result as { affected_pages: number; dry_run?: true };
      setDryRunInfo(
        `This will affect ${syncResult.affected_pages} ${syncResult.affected_pages === 1 ? "page" : "pages"}`,
      );
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) await showFailureToast("Dry run failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!newTag.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await renameTag({
        old_tag: oldTag,
        new_tag: newTag.trim().toLowerCase(),
      });
      await handleRenameResult(result, oldTag, newTag.trim().toLowerCase());
      onComplete();
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) await showFailureToast("Rename failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Rename "${oldTag}"`}
      actions={
        <ActionPanel>
          <Action
            title="Rename Tag"
            icon={Icon.Pencil}
            onAction={handleSubmit}
          />
          <Action
            title="Preview Changes"
            icon={Icon.Eye}
            onAction={handleDryRun}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Current Tag" text={oldTag} />
      <Form.TextField
        id="newTag"
        title="New Tag Name"
        placeholder="Enter new tag name"
        value={newTag}
        onChange={setNewTag}
      />
      {dryRunInfo && <Form.Description title="Impact" text={dryRunInfo} />}
    </Form>
  );
}

// ── Merge Tag form ──────────────────────────────────────────────

function MergeTagForm({
  sourceTag,
  allTags,
  onComplete,
}: {
  sourceTag: string;
  allTags: TagIndexResponse | undefined;
  onComplete: () => void;
}) {
  const { pop } = useNavigation();
  const [targetTag, setTargetTag] = useState("");
  const [dryRunInfo, setDryRunInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collect all unique tags except the source for the dropdown
  const availableTargets = getAvailableTargets(allTags, sourceTag);

  async function handleDryRun() {
    if (!targetTag) return;
    setIsSubmitting(true);
    try {
      const result = await mergeTag(
        { old_tag: sourceTag, new_tag: targetTag },
        true,
      );
      const syncResult = result as { affected_pages: number; dry_run?: true };
      setDryRunInfo(
        `Merging "${sourceTag}" into "${targetTag}" will affect ${syncResult.affected_pages} ${syncResult.affected_pages === 1 ? "page" : "pages"}`,
      );
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) await showFailureToast("Dry run failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!targetTag) return;
    setIsSubmitting(true);
    try {
      const result = await mergeTag({
        old_tag: sourceTag,
        new_tag: targetTag,
      });
      await handleRenameResult(result, sourceTag, targetTag);
      onComplete();
      pop();
    } catch (error) {
      const handled = await handleApiError(error);
      if (!handled) await showFailureToast("Merge failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Merge "${sourceTag}"`}
      actions={
        <ActionPanel>
          <Action
            title="Merge Tags"
            icon={Icon.ArrowRight}
            onAction={handleSubmit}
          />
          <Action
            title="Preview Changes"
            icon={Icon.Eye}
            onAction={handleDryRun}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Source Tag"
        text={`"${sourceTag}" will be merged into the target tag`}
      />
      {availableTargets.length > 0 ? (
        <Form.Dropdown
          id="targetTag"
          title="Target Tag"
          value={targetTag}
          onChange={setTargetTag}
        >
          <Form.Dropdown.Item title="Select a tag..." value="" />
          {availableTargets.map((tag) => (
            <Form.Dropdown.Item key={tag} title={tag} value={tag} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="targetTag"
          title="Target Tag"
          placeholder="Enter target tag name"
          value={targetTag}
          onChange={setTargetTag}
        />
      )}
      {dryRunInfo && <Form.Description title="Impact" text={dryRunInfo} />}
    </Form>
  );
}

// ── Shared helpers ──────────────────────────────────────────────

function getAvailableTargets(
  allTags: TagIndexResponse | undefined,
  exclude: string,
): string[] {
  if (!allTags) return [];
  const all = new Set<string>();
  for (const entry of allTags.primary_tags ?? []) all.add(entry.tag);
  for (const entry of allTags.secondary_tags ?? []) all.add(entry.tag);
  for (const entry of allTags.user_tags ?? []) all.add(entry.tag);
  all.delete(exclude);
  return Array.from(all).sort();
}

/** Handle the result of a rename/merge — either sync success or async job. */
async function handleRenameResult(
  result: TagRenameResult,
  oldTag: string,
  newTag: string,
) {
  if ("job_id" in result) {
    // Async operation — poll for completion
    await showToast({
      style: Toast.Style.Animated,
      title: "Processing...",
      message: `Renaming "${oldTag}" → "${newTag}" (${result.affected_pages} pages)`,
    });
    await pollTagJob(result.job_id);
  } else {
    await showToast({
      style: Toast.Style.Success,
      title: "Done",
      message: `"${oldTag}" → "${newTag}" (${result.affected_pages} pages affected)`,
    });
  }
}

/** Poll a tag job until completion or failure. */
async function pollTagJob(jobId: string): Promise<void> {
  const maxAttempts = 60; // 3 seconds * 60 = 3 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const job = await getTagJob(jobId);
      if (job.status === "completed") {
        await showToast({
          style: Toast.Style.Success,
          title: "Tag operation completed",
          message: `${job.processed_pages} pages updated`,
        });
        return;
      }
      if (job.status === "failed") {
        await showToast({
          style: Toast.Style.Failure,
          title: "Tag operation failed",
          message: job.error ?? "Unknown error",
        });
        return;
      }
    } catch {
      // Continue polling on transient errors
    }
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Operation timed out",
    message: "The tag operation is still processing. Check back later.",
  });
}
