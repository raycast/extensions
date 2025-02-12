import { Icon, PushAction, List, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import type { GemSearchResult } from "../rubygems/types";
import { GemInfo } from "./GemInfo";
import { mapGemLinks } from "../utils";

interface Props {
  gem: GemSearchResult;
}

export const GemOptions = ({ gem }: Props): JSX.Element => {
  return (
    <List navigationTitle={`Search RubyGems > ${gem.name}`}>
      <List.Section title="Actions">
        <List.Item
          key="gem-name"
          icon={Icon.ArrowRight}
          title="Show details"
          accessoryTitle="Dependencies and more"
          actions={
            <ActionPanel>
              <PushAction title="Show Details" icon={Icon.TextDocument} target={<GemInfo key={gem.sha} gem={gem} />} />
            </ActionPanel>
          }
        />
        <List.Item
          key="copy-bundler-string"
          icon={Icon.Clipboard}
          title="Copy Gem String"
          accessoryTitle={`gem '${gem.name}', '${gem.version}'`}
          actions={
            <ActionPanel>
              <CopyToClipboardAction content={`gem '${gem.name}', '${gem.version}'`} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Links">
        {mapGemLinks(gem).map((link) => {
          return (
            <List.Item
              title={`Open ${link["title"]}`}
              accessoryTitle={link["link"]}
              key={link["title"]}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction title="Open" url={link["link"]} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
};
