import { ActionPanel, Action, Color, List, Icon, Keyboard } from "@raycast/api";
import { URL } from "node:url";
import type { SearchResult } from "../types";

interface SearchListItemProps {
  searchResult: SearchResult;
}

export function SearchListItem({ searchResult }: SearchListItemProps) {
  return (
    <List.Item
      title={searchResult.attrName}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Submenu icon={Icon.Globe} title="Open…" shortcut={Keyboard.Shortcut.Common.Open}>
              {searchResult.source && (
                <Action.OpenInBrowser title="Open Package Source Code" url={searchResult.source} />
              )}
              {searchResult.homepage[0] && (
                <Action.OpenInBrowser title="Open Package Homepage" url={searchResult.homepage[0]} />
              )}
            </ActionPanel.Submenu>

            <ActionPanel.Submenu icon={Icon.Clipboard} title="Copy…" shortcut={Keyboard.Shortcut.Common.Copy}>
              <Action.CopyToClipboard title="Copy Package Attr Name" content={searchResult.attrName} />
              {searchResult.source && (
                <Action.CopyToClipboard title="Copy Package Source URL" content={searchResult.source} />
              )}
              {searchResult.homepage[0] && (
                <Action.CopyToClipboard title="Copy Package Homepage URL" content={searchResult.homepage[0]} />
              )}
            </ActionPanel.Submenu>

            <Action.CopyToClipboard
              title="Copy Package Attr Name"
              content={searchResult.attrName}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={`# ${searchResult.attrName}\n${searchResult.description ?? ""}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={searchResult.name} />
              <List.Item.Detail.Metadata.Label title="Version" text={searchResult.version} />
              {searchResult.homepage.map((url, idx) =>
                url ? (
                  <List.Item.Detail.Metadata.Link key={url} title="Homepage" target={url} text={new URL(url).host} />
                ) : (
                  <List.Item.Detail.Metadata.Label key={idx} title="Homepage" icon={Icon.Minus} />
                ),
              )}
              {searchResult.source && (
                <List.Item.Detail.Metadata.Link
                  title="Source"
                  target={searchResult.source!}
                  text={new URL(searchResult.source!).host}
                />
              )}
              {searchResult.licenses.map((license) =>
                license.url ? (
                  <List.Item.Detail.Metadata.Link
                    key={license.url}
                    title="License"
                    target={license.url}
                    text={license.name}
                  />
                ) : (
                  <List.Item.Detail.Metadata.Label key={license.name} title="License" text={license.name} />
                ),
              )}
              <List.Item.Detail.Metadata.TagList title="Outputs">
                {searchResult.outputs.map((text) => (
                  <List.Item.Detail.Metadata.TagList.Item
                    key={text}
                    text={text}
                    color={text === searchResult.defaultOutput ? Color.PrimaryText : Color.SecondaryText}
                  />
                ))}
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Platforms">
                {searchResult.platforms.map((text) => (
                  <List.Item.Detail.Metadata.TagList.Item key={text} text={text} />
                ))}
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}
