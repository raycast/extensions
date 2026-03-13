import {
  Action,
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  openExtensionPreferences,
  Toast,
  showToast,
} from "@raycast/api";
import { createBucketClient } from "@cosmicjs/sdk";
import { useFetch } from "@raycast/utils";
import React from "react";

interface Preferences {
  bucketSlug: string;
  readKey: string;
  writeKey: string;
}

interface ObjectsList extends React.ComponentPropsWithoutRef<typeof List> {
  objects: [
    {
      id: string;
      type: string;
      title: string;
      slug: string;
      metadata?: {
        snippet: string;
        url: string;
        read: boolean;
      };
    }
  ];
}

interface SingularObject extends React.ComponentPropsWithoutRef<typeof List> {
  object: {
    id: string;
    type: string;
    slug: string;
    title: string;
    metadata: {
      published: string;
      snippet: string;
      url: string;
      read: boolean;
    };
  };
}

export default function Command() {
  const { bucketSlug, readKey } = getPreferenceValues<Preferences>();
  const { data, isLoading } = useFetch<ObjectsList>(
    `https://api.cosmicjs.com/v3/buckets/${bucketSlug}/objects?query=%7B%22type%22:%22bookmarks%22%7D&read_key=${readKey}&depth=1&props=`
  );

  return (
    <>
      <List isLoading={isLoading} isShowingDetail>
        {data?.objects.map((object) => (
          <List.Item
            key={object.id}
            title={object.title}
            detail={
              <ObjectDetail id={object.id ?? ""} title={object.title ?? ""} />
            }
            actions={
              <Actions
                id={object.id ?? ""}
                title={object.title ?? ""}
                read={object.metadata?.read ?? false}
              />
            }
          />
        ))}
      </List>
    </>
  );
}

function ObjectDetail(props: { id: string; title: string }) {
  const { bucketSlug, readKey } = getPreferenceValues<Preferences>();

  const { data, isLoading } = useFetch<SingularObject>(
    `https://api.cosmicjs.com/v3/buckets/${bucketSlug}/objects/${props.id}?read_key=${readKey}&depth=1&props=`
  );

  if (!data?.object) {
    return null; // Return null when data is not available
  }

  const regex = /.*https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/|\/.*$/gm;
  const trimmedURL = data?.object.metadata.url.replace(regex, "");

  return (
    data?.object && (
      <List.Item.Detail
        isLoading={isLoading}
        markdown={
          `## ${props.title}` +
          "\n\n" +
          `${data?.object.metadata?.snippet ?? ""}`
        }
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label
              title="Slug"
              text={trimmedURL ?? ""}
            />
            <List.Item.Detail.Metadata.Label
              title="Status"
              text={data?.object.metadata.read ? "Read" : "Unread"}
            />
          </List.Item.Detail.Metadata>
        }
      />
    )
  );
}

function Actions(props: { id: string; title: string; read: boolean }) {
  const { bucketSlug, readKey, writeKey } = getPreferenceValues<Preferences>();

  const { data } = useFetch<SingularObject>(
    `https://api.cosmicjs.com/v3/buckets/${bucketSlug}/objects/${props.id}?read_key=${readKey}&depth=1&props=`
  );

  if (!data?.object || data === null) {
    return null; // Return null when data is not available
  }

  return (
    <ActionPanel title={props.title}>
      <ActionPanel.Section>
        {data?.object && (
          <Action.OpenInBrowser
            url={data?.object.metadata?.url}
            onOpen={() => {
              markRead(
                props.id,
                props.title,
                props.read,
                bucketSlug,
                readKey,
                writeKey
              );
            }}
          />
        )}
        {data?.object.slug && (
          <Action.CopyToClipboard
            content={data?.object.metadata?.url}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={
            data?.object.metadata?.read === true
              ? "Mark as Unread"
              : "Mark as Read"
          }
          icon={Icon.Checkmark}
          onAction={() =>
            markRead(
              props.id,
              props.title,
              props.read,
              bucketSlug,
              readKey,
              writeKey
            )
          }
        />
        <Action
          title="Delete Bookmark"
          icon={Icon.Trash}
          onAction={() =>
            deleteBookmark(props.id, props.title, bucketSlug, readKey, writeKey)
          }
          style={Action.Style.Destructive}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function markRead(
  id: string,
  title: string,
  read: boolean,
  bucketSlug: string,
  readKey: string,
  writeKey: string
) {
  const cosmic = createBucketClient({
    bucketSlug: bucketSlug,
    readKey: readKey,
    writeKey: writeKey,
  });

  try {
    await cosmic.objects.updateOne(id, {
      metadata: {
        read: read === true ? false : true,
      },
    });
    await showToast({
      title: `Marked ${title} as ${read === true ? "Unread" : "Read"}`,
    });
  } catch (err) {
    console.error(err);
  }
}

async function deleteBookmark(
  id: string,
  title: string,
  bucketSlug: string,
  readKey: string,
  writeKey: string
) {
  const cosmic = createBucketClient({
    bucketSlug: bucketSlug,
    readKey: readKey,
    writeKey: writeKey,
  });

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: `Deleting ${title}`,
    });
    await cosmic.objects.deleteOne(id);
    console.log("Deleted:", id);
    await showToast({ style: Toast.Style.Success, title: `Deleted ${title}` });
  } catch (err) {
    console.error(err);
  }
}
