import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { shortDomainName, slugify, convertStringCase } from "./lib/utils";

export default function Command() {
  const { isLoading, data, revalidate, error } = useFetch("https://cc0-lib.wtf/api/data");
  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown={`
# cc0-lib

Getting images from the satellite..`}
      />
    );
  }
  if (error) {
    return (
      <Detail
        isLoading={false}
        markdown={`
# cc0-lib

Failed to load data from API. Please try again later.`}
      />
    );
  }
  const res = data as DataAPIResponse;
  const random = Math.floor(Math.random() * res.data.length);
  const item = res.data[random];

  return (
    <Detail
      markdown={`![${item.Title}](${item.Thumbnails[0].url})`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Randomize" icon={Icon.RotateAntiClockwise} onAction={revalidate} />
          {item.Type === "Image" && (
            <Action.OpenInBrowser title="Open Image in Browser" icon={Icon.Window} url={item.Thumbnails[0].url} />
          )}
          <Action.OpenInBrowser
            title="Open Website"
            icon={Icon.Link}
            url={`https://cc0-lib.wtf/${slugify(item.Title)}`}
            shortcut={{
              modifiers: ["cmd"],
              key: "l",
            }}
          />
          {item.File && (
            <Action.OpenInBrowser
              title={`Download ${convertStringCase(item.Filetype, "pascal")}`}
              icon={Icon.ArrowDownCircle}
              url={item.File}
              shortcut={{
                modifiers: ["cmd"],
                key: "d",
              }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={item.Title} />
          <Detail.Metadata.Label title="Description" text={item.Description} />
          <Detail.Metadata.Separator />
          {item.Type && (
            <Detail.Metadata.Label title="Type" text={`${item.Type.toLowerCase()}/${item.Filetype.toLowerCase()}`} />
          )}
          <Detail.Metadata.Link
            title="Website"
            text="cc0-lib.wtf"
            target={`https://cc0-lib.wtf/${slugify(item.Title)}`}
          />
          <Detail.Metadata.Link title="Source" text={shortDomainName(item.Source)} target={item.Source} />
          <Detail.Metadata.TagList title="Tags">
            {item.Tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
