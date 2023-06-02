import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  openExtensionPreferences,
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
            detail={<ObjectDetail id={object.id ?? ""} />}
            actions={<Actions id={object.id ?? ""} />}
          />
        ))}
      </List>
    </>
  );
}

function ObjectDetail(props: { id: string }) {
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
          `## ${data?.object.title}` +
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

function Actions(props: { id: string }) {
  const { bucketSlug, readKey, writeKey } = getPreferenceValues<Preferences>();

  const { data } = useFetch<SingularObject>(
    `https://api.cosmicjs.com/v3/buckets/${bucketSlug}/objects/${props.id}?read_key=${readKey}&depth=1&props=`
  );

  if (!data?.object || data === null) {
    return null; // Return null when data is not available
  }

  return (
    <ActionPanel title={data?.object.title}>
      <ActionPanel.Section>
        {data?.object && (
          <Action.OpenInBrowser
            url={data?.object.metadata?.url}
            onOpen={() => {
              markRead(props.id, bucketSlug, readKey, writeKey);
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
          title="Open Extension Preferences"
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function markRead(
  id: string,
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
    const response = await cosmic.objects.updateOne(id, {
      metadata: {
        read: true,
      },
    });
    console.log("Marked as read:", id);
    const data = await response.object;
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
