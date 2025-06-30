import { getPreferenceValues, ActionPanel, Action, List, Icon } from "@raycast/api";
import { getContentTypes, getEntries } from "./lib/services";
import { ContentType } from "./types";
import { kindName, entryTtile, entrySubtitle, capitalize } from "./lib/utils";

export default function ExploreContent() {
  const { isLoading, data } = getContentTypes();
  const { host } = getPreferenceValues();

  return (
    <List isLoading={isLoading}>
      {data?.map((item) => (
        <List.Item
          key={item.uid}
          title={capitalize(item.schema.pluralName.replaceAll("-", " "))}
          subtitle={item.schema.description}
          accessories={[
            { tag: kindName(item.schema.kind) },
            { icon: item.schema.kind === "singleType" ? Icon.ArrowNe : Icon.ArrowRight },
          ]}
          actions={
            <ActionPanel title={item.schema.displayName}>
              {item.schema.kind === "collectionType" ? (
                <Action.Push
                  icon={Icon.ArrowRight}
                  title={`List ${capitalize(item.schema.pluralName.replaceAll("-", " "))}`}
                  target={<Entries contentType={item} />}
                />
              ) : (
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="Open in Strapi"
                  url={`${host}/admin/content-manager/collection-types/${item.uid}`}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Entries({ contentType }: { contentType: ContentType }) {
  const { host } = getPreferenceValues();
  const { data, isLoading } = getEntries(contentType.route);

  return (
    <List isLoading={isLoading}>
      {data?.map((item) => (
        <List.Item
          key={item.id.toString()}
          title={entryTtile(item)}
          subtitle={entrySubtitle(item)}
          accessories={[{ tag: new Date(item.createdAt.toString()) }, { icon: Icon.ArrowNe }]}
          actions={
            <ActionPanel title={entryTtile(item)}>
              <Action.OpenInBrowser
                icon={Icon.ArrowNe}
                title="Open in Strapi"
                url={`${host}/admin/content-manager/collection-types/${contentType.uid}/${item.documentId}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
