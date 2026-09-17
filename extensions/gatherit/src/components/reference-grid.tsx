import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Grid,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState } from "react";

import {
  listCategories,
  searchReferences,
  type GatherReference,
} from "../lib/api";
import { copyImageToClipboard } from "../lib/clipboard-image";
import { formatReferenceForAi, referenceDetailMarkdown } from "../lib/format";
import { signOut } from "../lib/oauth";

async function handleSignOut() {
  await signOut();
  await showToast({
    style: Toast.Style.Success,
    title: "Signed out of Gather",
  });
  // Close back to Raycast root; the next launch re-triggers the OAuth flow.
  await popToRoot();
}

const PAGE_LIMIT = 50;

function subtitleFor(ref: GatherReference): string {
  if (ref.categories.length > 0) return ref.categories.join(" · ");
  if (ref.tags.length > 0) return ref.tags.slice(0, 3).join(" · ");
  return ref.domain ?? "";
}

function ReferenceDetail({ reference }: { reference: GatherReference }) {
  return (
    <Detail
      markdown={referenceDetailMarkdown(reference)}
      navigationTitle={reference.title}
      metadata={
        <Detail.Metadata>
          {reference.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {reference.tags.map((t) => (
                <Detail.Metadata.TagList.Item key={t} text={t} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {reference.elements.length > 0 && (
            <Detail.Metadata.TagList title="Elements">
              {reference.elements.map((e) => (
                <Detail.Metadata.TagList.Item key={e} text={e} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {reference.categories.length > 0 && (
            <Detail.Metadata.TagList title="Categories">
              {reference.categories.map((c) => (
                <Detail.Metadata.TagList.Item key={c} text={c} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {reference.domain && (
            <Detail.Metadata.Label title="Domain" text={reference.domain} />
          )}
          {reference.sourceUrl && (
            <Detail.Metadata.Link
              title="Source"
              target={reference.sourceUrl}
              text={reference.sourceUrl}
            />
          )}
        </Detail.Metadata>
      }
      actions={<ReferenceActions reference={reference} showSignOut />}
    />
  );
}

function ReferenceActions({
  reference,
  showSignOut = false,
}: {
  reference: GatherReference;
  showSignOut?: boolean;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Copy">
        <Action
          title="Copy for AI"
          icon={Icon.Stars}
          onAction={async () => {
            await Clipboard.copy(formatReferenceForAi(reference));
            await showHUD("Copied for AI ✓");
          }}
        />
        <Action
          title="Copy Image"
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onAction={() => copyImageToClipboard(reference)}
        />
        {reference.sourceUrl && (
          <Action.CopyToClipboard
            title="Copy Source Link"
            content={reference.sourceUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            onCopy={() =>
              showToast({ style: Toast.Style.Success, title: "Link copied" })
            }
          />
        )}
        {reference.imageUrl && (
          <Action.CopyToClipboard
            title="Copy Image Markdown"
            content={`![${reference.title}](${reference.imageUrl})`}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Open">
        <Action.Push
          title="View Details"
          icon={Icon.Eye}
          target={<ReferenceDetail reference={reference} />}
        />
        <Action.OpenInBrowser
          title="Open in Gather"
          url={reference.appUrl}
          icon={Icon.Globe}
        />
        {reference.sourceUrl && (
          <Action.OpenInBrowser title="Open Source" url={reference.sourceUrl} />
        )}
      </ActionPanel.Section>
      {showSignOut && (
        <ActionPanel.Section title="Account">
          <Action
            title="Sign out"
            icon={Icon.Logout}
            style={Action.Style.Destructive}
            onAction={handleSignOut}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

function GridActions() {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Account">
        <Action
          title="Sign out"
          icon={Icon.Logout}
          style={Action.Style.Destructive}
          onAction={handleSignOut}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ReferenceGrid() {
  const [searchText, setSearchText] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const { data: categories } = useCachedPromise(listCategories, [], {
    initialData: [],
    failureToastOptions: { title: "Couldn't load categories" },
  });

  const { data, isLoading } = usePromise(
    async (query: string, cat: string | undefined) => {
      const result = await searchReferences({
        query: query ? query : undefined,
        categoryId: cat,
        sort: "newest",
        limit: PAGE_LIMIT,
      });
      return result;
    },
    [searchText, categoryId],
    {
      failureToastOptions: { title: "Couldn't load references" },
    },
  );

  const items = data?.items ?? [];
  const usage = data?.usage;

  return (
    <Grid
      columns={4}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      throttle
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your references…"
      actions={<GridActions />}
      searchBarAccessory={
        categories && categories.length > 0 ? (
          <Grid.Dropdown
            tooltip="Filter by category"
            storeValue
            onChange={(value) =>
              setCategoryId(value === "all" ? undefined : value)
            }
          >
            <Grid.Dropdown.Item title="All Categories" value="all" />
            <Grid.Dropdown.Section>
              {categories.map((c) => (
                <Grid.Dropdown.Item
                  key={c.id}
                  title={`${c.name} (${c.count})`}
                  value={c.id}
                />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : undefined
      }
    >
      <Grid.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No references found"
        description={
          usage
            ? `${usage.current}${usage.limit ? ` / ${usage.limit}` : ""} references saved`
            : "Save something to Gather to see it here."
        }
      />
      {items.map((ref) => (
        <Grid.Item
          key={ref.id}
          content={
            ref.imageUrl ? { source: ref.imageUrl } : { source: Icon.Image }
          }
          title={ref.title}
          subtitle={subtitleFor(ref)}
          actions={<ReferenceActions reference={ref} />}
        />
      ))}
    </Grid>
  );
}
