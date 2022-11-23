import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { useId, useMemo } from "react";
import { useCollections, useUser } from "../lib/hooks";
import { User } from "../lib/types";
import Collection from "./Collection";

const MAX_CHARACTERS = 90;
const splitParagraphIntoLines = (_paragraph: string) => {
  const paragraph = _paragraph.trim();
  const lines = [];

  let cursor = 0;
  while (cursor < paragraph.length) {
    // build lines by adding words until we reach the max characters per line
    let line = "";
    while (line.length < MAX_CHARACTERS && cursor < paragraph.length) {
      const maxLineInfo = paragraph.slice(cursor);
      const consumeNonWhitespace = maxLineInfo.match(/^[^\s]+/);
      const consumeWhitespace = maxLineInfo.match(/^[\t\f\v ]+/);

      if (consumeNonWhitespace) {
        line += consumeNonWhitespace[0];
        cursor += consumeNonWhitespace[0].length;
      } else if (consumeWhitespace) {
        // scan for whitespace or punctuation
        line += consumeWhitespace[0];
        cursor += consumeWhitespace[0].length;
      } else {
        // line breaks
        cursor += 1;
        break;
      }
    }

    lines.push(line.trim());
  }

  return lines;
};

export default function UserView({ user }: { user: User }) {
  const userId = user.customId || (user.custom_id as string);

  const { data: userData, isLoading, error } = useUser(userId);
  const { data: collectionsData, isLoading: isCollectionLoading } = useCollections(userId);

  const collections = useMemo(() => {
    if (collectionsData) {
      return collectionsData.data.nestedColls;
    } else {
      return [];
    }
  }, [collectionsData]);

  const userInfo = useMemo(() => {
    if (userData) {
      return userData.data;
    } else {
      return null;
    }
  }, [userData]);

  const userAbout = useMemo(() => {
    return splitParagraphIntoLines(user.about || "");
  }, [user.about]);

  return (
    <List isLoading={isLoading || isCollectionLoading} filtering={false}>
      <List.Section>
        <List.Item
          title={user?.name || ""}
          icon={{
            source: user.avatar,
            mask: Image.Mask.Circle,
          }}
          subtitle={`@${userId}`}
          accessories={[
            {
              text: userInfo?.headline || "",
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={`https://www.curator.bio/${userId}`} />
            </ActionPanel>
          }
        />
      </List.Section>

      {userAbout && (
        <List.Section title="About">
          {userAbout.map((line, index) => (
            <List.Item key={index} title={line} />
          ))}
        </List.Section>
      )}

      <List.Section title="Collections">
        {collections.map((collection) => {
          const collectionId = collection.customId;

          return (
            <List.Item
              title={`${collection.icon} ${collection.name}`}
              key={collectionId}
              accessories={[
                {
                  text: `${collection.items.length} items`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View All"
                    icon={Icon.List}
                    target={<Collection userId={userId} collectionId={collectionId} user={user} />}
                  />

                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`https://www.curator.bio/${userId}/${collectionId}`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
