import { ActionPanel, List, Action, Icon, useNavigation, Toast, Image, Color, showToast, Form } from "@raycast/api";
import { useState, Fragment, useMemo } from "react";
import { DateTime } from "luxon";
import { nanoid } from "nanoid";
import { useMutation, useQuery } from "@apollo/client";

import { Sourcegraph, instanceName, newURL } from "../sourcegraph";
import {
  BatchChangeFields as BatchChange,
  ChangesetFields as Changeset,
  GetChangesets,
  GetChangesetsVariables,
  GetBatchChanges,
  MergeChangeset,
  MergeChangesetVariables,
  ReenqueueChangeset,
  ReenqueueChangesetVariables,
  PublishChangesetVariables,
  PublishChangeset,
} from "../sourcegraph/gql/schema";
import { copyShortcut, refreshShortcut, secondaryActionShortcut, tertiaryActionShortcut } from "./shortcuts";
import ExpandableErrorToast from "./ExpandableErrorToast";
import { propsToKeywords } from "./keywords";
import { GET_BATCH_CHANGES, GET_CHANGESETS } from "../sourcegraph/gql/queries";
import {
  MERGE_CHANGESET,
  PUBLISH_CHANGEST as PUBLISH_CHANGESET,
  REENQUEUE_CHANGEST as REENQUEUE_CHANGESET,
} from "../sourcegraph/gql/mutations";

/**
 * ManageBatchChanges is the shared batch changes command implementation.
 */
export default function ManageBatchChanges({ src }: { src: Sourcegraph }) {
  const srcName = instanceName(src);
  const [searchText, setSearchText] = useState("");

  const { loading, error, data, refetch } = useQuery<GetBatchChanges>(GET_BATCH_CHANGES, {
    client: src.client,
  });
  const refresh = async () => {
    await refetch();
  };
  const batchChanges = useMemo(() => data?.batchChanges?.nodes || [], [data]);

  const { push } = useNavigation();
  if (error) {
    ExpandableErrorToast(push, "Unexpected error", "Get batch changes failed", error.message).show();
  }

  const showSuggestions = !loading && searchText === "";
  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Manage batch changes on ${srcName}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      enableFiltering={true}
      selectedItemId={showSuggestions ? "first-result" : undefined}
    >
      {showSuggestions ? (
        <List.Section title={"Suggestions"}>
          <List.Item
            title="Create a batch change"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Create in Browser" url={newURL(src, "/batch-changes/create")} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : (
        <Fragment />
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

  const icon: Image.ImageLike = { source: Icon.Circle };
  switch (batchChange.state) {
    case "OPEN":
      icon.source = Icon.Circle;
      icon.tintColor = Color.Green;
      break;
    case "CLOSED":
      icon.source = Icon.Checkmark;
      icon.tintColor = Color.Red;
      break;
    case "DRAFT":
      icon.source = Icon.Document;
      break;
  }

  const { changesetsStats } = batchChange;
  const accessories: List.Item.Accessory[] = [];
  if (changesetsStats.open) {
    accessories.push({
      icon: { tintColor: Color.Green, source: Icon.Circle },
      text: `${changesetsStats.open}`,
    });
  }
  if (changesetsStats.merged) {
    accessories.push({
      icon: { tintColor: Color.Purple, source: Icon.Checkmark },
      text: `${changesetsStats.merged}`,
    });
  }
  if (changesetsStats.draft || changesetsStats.unpublished) {
    accessories.push({
      icon: { tintColor: Color.SecondaryText, source: Icon.Document },
      text: `${changesetsStats.draft + changesetsStats.unpublished}`,
    });
  }

  const url = newURL(src, batchChange.url);
  return (
    <List.Item
      id={id}
      icon={icon}
      title={`${batchChange.namespace.namespaceName} / ${batchChange.name}`}
      subtitle={updated ? `by ${author}, updated ${updated}` : author}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            key={nanoid()}
            title="View Batch Change"
            icon={{ source: Icon.MagnifyingGlass }}
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
            url={newURL(src, "/batch-changes")}
            shortcut={tertiaryActionShortcut}
          />
        </ActionPanel>
      }
    />
  );
}

function BatchChangeView({ batchChange, src }: { batchChange: BatchChange; src: Sourcegraph }) {
  const { loading, error, data, refetch } = useQuery<GetChangesets, GetChangesetsVariables>(GET_CHANGESETS, {
    client: src.client,
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
    ExpandableErrorToast(push, "Unexpected error", "Get changesets failed", error.message).show();
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
    newURL(src, batchChange.url, new URLSearchParams({ status: changeset.state }));

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

  const [mergeChangeset, { error: mergeError }] = useMutation<MergeChangeset, MergeChangesetVariables>(
    MERGE_CHANGESET,
    {
      client: src.client,
    }
  );
  const [reenqueueChangeset, { error: reenqueueError }] = useMutation<ReenqueueChangeset, ReenqueueChangesetVariables>(
    REENQUEUE_CHANGESET,
    { client: src.client }
  );
  const [publishChangeset, { error: publishError }] = useMutation<PublishChangeset, PublishChangesetVariables>(
    PUBLISH_CHANGESET,
    { client: src.client }
  );
  const error = mergeError || publishError || reenqueueError;
  if (error) {
    ExpandableErrorToast(push, "Unexpected error", "Changeset operation failed", error.message).show();
  }

  const icon: Image.ImageLike = { source: Icon.Circle };
  let secondaryAction = <></>;
  let subtitle = changeset.state.toLowerCase();
  switch (changeset.state) {
    case "OPEN":
      icon.tintColor = Color.Green;
      icon.source = Icon.Circle;

      if (changeset.__typename !== "ExternalChangeset") {
        break;
      }

      subtitle = changeset.reviewState?.toLocaleLowerCase() || "";
      switch (changeset.reviewState) {
        case "APPROVED":
          icon.source = Icon.Checkmark;
          break;
        case "CHANGES_REQUESTED":
          icon.source = Icon.XmarkCircle;
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
      icon.source = Icon.XmarkCircle;
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
  if (changeset.__typename === "ExternalChangeset") {
    title = `${changeset.repository.name}`;
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
      icon={icon}
      title={title}
      subtitle={subtitle}
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
            url={newURL(src, batchChange.url)}
            shortcut={tertiaryActionShortcut}
          />
        </ActionPanel>
      }
    />
  );
}
