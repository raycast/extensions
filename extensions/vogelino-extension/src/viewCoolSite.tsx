import { ActionPanel, Detail } from "@raycast/api";
import CommonActions from "./utils/commonActions";
import { CoolSiteType } from "./utils/coolSiteTypesAndSchemas";
import ItemActions from "./utils/itemActions";

function ViewCoolSite({ item }: { item: CoolSiteType }) {
  const url = new URL(item.url);
  return (
    <Detail
      markdown={item.thumbnail ? `![${item.title}](${item.thumbnail})` : `# ${item.title}`}
      actions={
        <ActionPanel>
          <ItemActions item={item} showViewCoolSiteCommand={false} />
          <CommonActions />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={item.title} icon={item.favicon || undefined} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="External Link"
            text={`${url.hostname.replace(/^(www\.)?/, "")}${url.pathname.replace(/\/$/, "")}`}
            target={item.url}
          />
          <Detail.Metadata.Link
            title="Portfolio Link"
            text={`${item.id}`}
            target={`https://lucasvogel.click/cool-sites/${item.id}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Tags">
            {item.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

export default ViewCoolSite;
