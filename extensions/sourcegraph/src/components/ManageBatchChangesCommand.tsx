import { ActionPanel, List, Action, Icon, useNavigation, Toast, Image, Color, showToast, Form } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useState, useMemo, useEffect } from "react";
import { DateTime } from "luxon";
import { nanoid } from "nanoid";

import { Sourcegraph, instanceName, LinkBuilder } from "../sourcegraph";
import {
  BatchChangeFragment as BatchChange,
  ChangesetFragment as Changeset,
  useGetBatchChangesQuery,
  useGetChangesetsQuery,
  useMergeChangesetMutation,
  usePublishChangesetMutation,
  useReenqueueChangesetMutation,
} from "../sourcegraph/gql/operations";

import { copyShortcut, refreshShortcut, secondaryActionShortcut, tertiaryActionShortcut } from "./shortcuts";
import ExpandableToast from "./ExpandableToast";
import { propsToKeywords } from "./keywords";

import { sentenceCase } from "../text";
import { useTelemetry } from "../hooks/telemetry";

const link = new LinkBuilder("batch-changes");

/**
 * ManageBatchChanges is the shared batch changes command implementation.
 */
export default function ManageBatchChanges({ src }: { src: Sourcegraph }) {
  const { recorder } = useTelemetry(src);
  useEffect(() => recorder.recordEvent("manageBatchChanges", "start"), []);

  const srcName = instanceName(src);

  /**
   * searchText should not be used to set the search text in the filter, because this
   * causes a funky typing experience with throttle=false and the built-in filtering. As
   * such, setSearchText should also never be used except by List.
   */
  const [searchText, setSearchText] = useState("");

  const { loading, error, data, refetch } = useGetBatchChangesQuery({ client: src.client });
  const refresh = async () => {
    await refetch();
  };
  const batchChanges = useMemo(() => data?.batchChanges?.nodes || [], [data]);

  const { push } = useNavigation();
  if (error) {
    ExpandableToast(push, "Unexpected error", "Get batch changes failed", error.message).show();
  }

  const showSuggestions = !loading && searchText === "";
  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Manage batch changes on ${srcName}`}
      onSearchTextChange={setSearchText}
      filtering={true}
      selectedItemId={showSuggestions ? "first-result" : undefined}
    >
      {showSuggestions && (
        <List.Section title={"Suggestions"}>
          <List.Item
            title="Create a batch change"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Create in Browser" url={link.new(src, "/batch-changes/create")} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title={"Batch changes"}>
        {batchChanges.map((b, i) => (
          <BatchChangeItem
            id={i === 0 ? "first-result" : undefined}
            key={nanoid()}
            batchChange={b}
            src={src}
            refreshBatchChanges={refresh}
          />
        ))}
      </List.Section>
    </List>
  );
}

function BatchChangeItem({
  id,
  batchChange,
  src,
  refreshBatchChanges,
}: {
  id: string | undefined;
  batchChange: BatchChange;
  src: Sourcegraph;
  refreshBatchChanges: () => Promise<void>;
}) {
  let updated: string | null = null;
  try {
    const d = DateTime.fromISO(batchChange.updatedAt);
    updated = d.toRelative();
  } catch (e) {
    console.warn(`batch change ${batchChange.id}: invalid date: ${e}`);
  }
  const author = batchChange.creator?.displayName || batchChange.creator?.username;

  // Indicated published changesets with the icon
  const { changesetsStats } = batchChange;
  const publishedChangesets = changesetsStats.total - changesetsStats.unpublished;
  const progress = publishedChangesets ? publishedChangesets / changesetsStats.total : 0;
  let icon: Image.ImageLike;
  switch (batchChange.state) {
    case "OPEN":
      // Provide hex because this API does not accept Color.
      icon = getProgressIcon(progress, "#37b24d");
      break;
    case "CLOSED":
      // Provide hex because this API does not accept Color.
      icon = getProgressIcon(progress, "#c92a2a");
      break;
    default:
      icon = { source: Icon.Document };
  }

  // Add summary stats
  const accessories: List.Item.Accessory[] = [];
  if (changesetsStats.open) {
    accessories.push({
      icon: { tintColor: Color.Green, source: Icon.Circle },
      text: `${changesetsStats.open}`,
      tooltip: "Open changesets",
    });
  }
  if (changesetsStats.merged) {
    accessories.push({
      icon: { tintColor: Color.Purple, source: Icon.Checkmark },
      text: `${changesetsStats.merged}`,
      tooltip: "Merged changesets",
    });
  }
  if (changesetsStats.draft || changesetsStats.unpublished) {
    accessories.push({
      icon: { tintColor: Color.SecondaryText, source: Icon.CircleEllipsis },
      text: `${changesetsStats.draft + changesetsStats.unpublished}`,
      tooltip: "Unpublished changesets",
    });
  }

  const url = link.new(src, batchChange.url);
  return (
    <List.Item
      id={id}
      icon={{ value: icon, tooltip: sentenceCase(batchChange.state) }}
      title={`${batchChange.namespace.namespaceName} / ${batchChange.name}`}
      subtitle={updated ? `by ${author}, updated ${updated}` : author}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            key={nanoid()}
            title="View Batch Change"
            icon={{ source: Icon.Maximize }}
            target={<BatchChangeView batchChange={batchChange} src={src} />}
          />
          <Action.OpenInBrowser key={nanoid()} url={url} shortcut={secondaryActionShortcut} />
          <Action
            title="Refresh Batch Changes"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Refreshing...",
              });
              await refreshBatchChanges();
              toast.hide();
            }}
            shortcut={refreshShortcut}
          />
          <Action.CopyToClipboard key={nanoid()} title="Copy Batch Change URL" content={url} shortcut={copyShortcut} />
          <Action.OpenInBrowser
            key={nanoid()}
            title="Open Batch Changes in Browser"
            url={link.new(src, "/batch-changes")}
            shortcut={tertiaryActionShortcut}
          />
        </ActionPanel>
      }
    />
  );
}

function BatchChangeView({ batchChange, src }: { batchChange: BatchChange; src: Sourcegraph }) {
  const { loading, error, data, refetch } = useGetChangesetsQuery({
    ...src,
    variables: {
      namespace: batchChange.namespace.id,
      name: batchChange.name,
    },
  });
  const refresh = async () => {
    await refetch();
  };
  const changesets = useMemo(() => data?.batchChange?.changesets?.nodes || [], [data]);

  const { push } = useNavigation();
  if (error) {
    ExpandableToast(push, "Unexpected error", "Get changesets failed", error.message).show();
  }

  const published = changesets.filter((c) => c.state !== "UNPUBLISHED");
  const unpublished = changesets.filter((c) => c.state === "UNPUBLISHED");
  return (
    <List
      navigationTitle={"Manage Batch Change Changesets"}
      searchBarPlaceholder={`Search changesets for ${batchChange.name}`}
      isLoading={loading}
    >
      <List.Section
        title={"Published changesets"}
        subtitle={
          published.length > 0
            ? [
                batchChange.changesetsStats.open ? `${batchChange.changesetsStats.open} open` : undefined,
                batchChange.changesetsStats.closed ? `${batchChange.changesetsStats.closed} closed` : undefined,
                batchChange.changesetsStats.merged ? `${batchChange.changesetsStats.merged} merged` : undefined,
                batchChange.changesetsStats.failed ? `${batchChange.changesetsStats.failed} failed` : undefined,
              ]
                .filter((s) => !!s)
                .join(", ")
            : "0 changesets"
        }
      >
        {published.map((c) => (
          <ChangesetItem key={nanoid()} src={src} batchChange={batchChange} changeset={c} refreshChangesets={refresh} />
        ))}
      </List.Section>
      <List.Section title={"Unpublished changesets"} subtitle={`${unpublished.length} changesets`}>
        {unpublished.map((c) => (
          <ChangesetItem key={nanoid()} src={src} batchChange={batchChange} changeset={c} refreshChangesets={refresh} />
        ))}
      </List.Section>
    </List>
  );
}

function ChangesetItem({
  src,
  batchChange,
  changeset,
  refreshChangesets,
}: {
  src: Sourcegraph;
  batchChange: BatchChange;
  changeset: Changeset;
  refreshChangesets: () => Promise<void>;
}) {
  let updated: string | null = null;
  try {
    const d = DateTime.fromISO(changeset.updatedAt);
    updated = d.toRelative();
  } catch (e) {
    console.warn(`changeset ${changeset.id}: invalid date: ${e}`);
  }
  const url =
    (changeset.__typename === "ExternalChangeset" && changeset.externalURL?.url) ||
    link.new(src, batchChange.url, new URLSearchParams({ status: changeset.state }));

  const { push } = useNavigation();
  async function delayedRefreshChangesets() {
    await new Promise((r) => setTimeout(r, 1000));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing...",
    });
    await refreshChangesets();
    toast.hide();
  }

  const [mergeChangeset, { error: mergeError }] = useMergeChangesetMutation(src);
  const [reenqueueChangeset, { error: reenqueueError }] = useReenqueueChangesetMutation(src);
  const [publishChangeset, { error: publishError }] = usePublishChangesetMutation(src);
  const error = mergeError || publishError || reenqueueError;
  if (error) {
    ExpandableToast(push, "Unexpected error", "Changeset operation failed", error.message).show();
  }

  const icon: Image.ImageLike = { source: Icon.Circle };
  const tooltipDetails: string[] = [changeset.state];
  let secondaryAction = <></>;
  let subtitle = changeset.state.toLowerCase();
  switch (changeset.state) {
    case "OPEN":
      icon.tintColor = Color.Green;
      icon.source = Icon.Dot;

      if (changeset.__typename !== "ExternalChangeset") {
        break;
      }

      subtitle = changeset.reviewState?.toLocaleLowerCase() || "";
      if (changeset.reviewState) {
        tooltipDetails.push(changeset.reviewState);
      }
      switch (changeset.reviewState) {
        case "APPROVED":
          icon.source = Icon.Checkmark;
          break;
        case "CHANGES_REQUESTED":
          icon.source = Icon.XMarkCircle;
          break;
        default:
          icon.source = Icon.Circle;
      }
      secondaryAction = (
        <Action.Push
          title="Merge Changeset"
          icon={Icon.Checkmark}
          target={
            <Form
              navigationTitle="Merge Changeset"
              actions={
                <ActionPanel>
                  <Action.SubmitForm
                    title="Merge Changeset"
                    icon={Icon.Checkmark}
                    onSubmit={async ({ squash }: { squash: number }) => {
                      await mergeChangeset({
                        variables: {
                          batchChange: batchChange.id,
                          changeset: changeset.id,
                          squash: squash === 1,
                        },
                      });
                      showToast({
                        style: Toast.Style.Success,
                        title: "Changeset has been submitted for merge!",
                      });
                      await delayedRefreshChangesets();
                    }}
                  />
                  <Action.OpenInBrowser url={url} />
                </ActionPanel>
              }
            >
              <Form.Description title={"Changeset"} text={`${changeset.repository.name}#${changeset.externalID}`} />
              <Form.Description title={"Title"} text={changeset.title || ""} />
              <Form.Description title={"Review"} text={changeset.reviewState?.toLocaleLowerCase() || "unknown"} />
              <Form.Separator />
              <Form.Checkbox id="squash" label="Squash commits" defaultValue={true} storeValue={true} />
            </Form>
          }
        />
      );
      break;

    case "MERGED":
      icon.source = Icon.Checkmark;
      icon.tintColor = Color.Purple;
      break;

    case "CLOSED":
      icon.source = Icon.XMarkCircle;
      icon.tintColor = Color.Red;
      break;

    case "FAILED":
      icon.source = Icon.ExclamationMark;
      icon.tintColor = Color.Red;
      secondaryAction = (
        <Action
          title="Retry Changeset"
          icon={Icon.Hammer}
          onAction={async () => {
            await reenqueueChangeset({
              variables: {
                changeset: changeset.id,
              },
            });
            showToast({
              style: Toast.Style.Success,
              title: "Changeset has been submitted for retry!",
            });
            await delayedRefreshChangesets();
          }}
        />
      );
      break;

    case "UNPUBLISHED":
      icon.source = Icon.Document;
      secondaryAction = (
        <Action
          title="Publish Changeset"
          icon={Icon.Hammer}
          onAction={async () => {
            await publishChangeset({
              variables: {
                batchChange: batchChange.id,
                changeset: changeset.id,
              },
            });
            showToast({
              style: Toast.Style.Success,
              title: "Changeset has been submitted for publishing!",
            });
            await delayedRefreshChangesets();
          }}
        />
      );
      break;

    case "PROCESSING":
    case "RETRYING":
      icon.source = Icon.Clock;
      break;
  }

  let title = "";
  let props = {};
  let subtitleTooltip: string | null | undefined = null;
  if (changeset.__typename === "ExternalChangeset") {
    title = `${changeset.repository.name}`;
    subtitleTooltip = changeset.title;
    if (changeset.externalID) {
      subtitle = `#${changeset.externalID} ${subtitle}`;
    }
    props = {
      state: changeset.state,
      review: changeset.reviewState,
      checks: changeset.checkState,
    };
  } else {
    title = "Unknown repository";
    props = {
      state: changeset.state,
    };
  }

  return (
    <List.Item
      icon={{ value: icon, tooltip: sentenceCase(tooltipDetails.join(", ")) }}
      title={title}
      subtitle={subtitleTooltip ? { value: subtitle, tooltip: subtitleTooltip } : subtitle}
      accessories={updated ? [{ text: updated }] : undefined}
      keywords={propsToKeywords(props)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          {secondaryAction}
          <Action
            title="Refresh Changesets"
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await refreshChangesets();
            }}
            shortcut={refreshShortcut}
          />
          <Action.CopyToClipboard content={url} shortcut={copyShortcut} />
          <Action.OpenInBrowser
            key={nanoid()}
            title="Open Changesets in Browser"
            url={link.new(src, batchChange.url)}
            shortcut={tertiaryActionShortcut}
          />
        </ActionPanel>
      }
    />
  );
}
