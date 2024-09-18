import { Action, ActionPanel, Detail, Icon, open } from "@raycast/api";
import { SearchResult } from "../lib/types";
import { mapIconCode } from "../lib/utils";
import html2md from "html-to-md";

export default function PreviewDetail(searchResult: SearchResult) {
  return (
    <Detail
      isLoading={false}
      navigationTitle={searchResult.name}
      markdown={"# " + searchResult.name + "\n" + html2md(searchResult.body)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={searchResult.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Date"
            icon={Icon.Calendar}
            text={new Date(searchResult.dateInserted).toLocaleDateString()}
          />
          <Detail.Metadata.Label
            title="Type"
            icon={mapIconCode(searchResult.type)}
            text={capitalizeFirstLetter(searchResult.type)}
          />
          <Detail.Metadata.Link title="URL" text={searchResult.url} target={searchResult.url} />
          <Detail.Metadata.TagList title="Path">
            {searchResult.breadcrumbs.map((breadcrumb) => (
              <Detail.Metadata.TagList.Item
                key={breadcrumb.url}
                text={breadcrumb.name}
                color={"#ec008c"}
                onAction={() => {
                  open(breadcrumb.url);
                }}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {searchResult.insertUser?.name ? (
            <Detail.Metadata.Label
              title="Author"
              icon={
                searchResult.insertUser.photoUrl && searchResult.insertUser.name != "System"
                  ? searchResult.insertUser.photoUrl
                  : Icon.Person
              }
              text={searchResult.insertUser.name}
            />
          ) : null}
          {searchResult.insertUser != null && searchResult.insertUser.url ? (
            <Detail.Metadata.Link
              title="Profile"
              target={searchResult.insertUser.url}
              text={searchResult.insertUser.url}
            />
          ) : null}
          <Detail.Metadata.TagList title="About">
            {searchResult.insertUser != null && searchResult.insertUser.label ? (
              <Detail.Metadata.TagList.Item text={searchResult.insertUser.label} color={"#00aeef"} />
            ) : null}
            {searchResult.insertUser != null && searchResult.insertUser.title ? (
              <Detail.Metadata.TagList.Item text={searchResult.insertUser.title} color={"#00aeef"} />
            ) : null}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
