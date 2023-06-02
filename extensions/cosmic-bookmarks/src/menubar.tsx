import { MenuBarExtra, Icon, getPreferenceValues, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import React from "react";

interface Preferences {
  bucketSlug: string;
  readKey: string;
  writeKey: string;
}

interface ObjectsList
  extends React.ComponentPropsWithoutRef<typeof MenuBarExtra> {
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

export default function Command(): JSX.Element {
  const { bucketSlug, readKey } = getPreferenceValues<Preferences>();
  const { data, isLoading } = useFetch<ObjectsList>(
    `https://api.cosmicjs.com/v3/buckets/${bucketSlug}/objects?query=%7B%22type%22:%22bookmarks%22%7D&read_key=${readKey}&depth=1&props=&limit=50`
  );

  const regex = /.*https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/|\/.*$/gm;

  return (
    <MenuBarExtra icon={Icon.Bookmark} isLoading={isLoading}>
      <MenuBarExtra.Section title="Bookmarks">
        {data?.objects.map((bookmark) => (
          <MenuBarExtra.Item
            key={bookmark.id}
            title={bookmark.title}
            icon={bookmark.metadata?.read ? Icon.Checkmark : Icon.Circle}
            subtitle={bookmark.metadata?.url.replace(regex, "")}
            onAction={() => open(bookmark.metadata?.url ?? "")}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
