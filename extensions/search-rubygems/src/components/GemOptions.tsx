import { Icon, List, ActionPanel, Action } from "@raycast/api";
import type { GemSearchResult } from "../rubygems/types";
import { GemInfo } from "./GemInfo";
import { mapGemLinks } from "../utils";

interface Props {
  gem: GemSearchResult;
}

export const GemOptions = ({ gem }: Props) => {
  return (
    <List navigationTitle={`Search RubyGems > ${gem.name}`}>
      <List.Section title="Actions">
        <List.Item
          key="gem-name"
          icon={Icon.ArrowRight}
          title="Show details"
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                icon={Icon.BlankDocument}
                target={<GemInfo key={gem.sha} gem={gem} />}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: "Dependencies and more",
            },
          ]}
        />
        <List.Item
          key="copy-bundler-string"
          icon={Icon.Clipboard}
          title="Copy Gem String"
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={`gem '${gem.name}', '~> ${gem.version}'`} />
            </ActionPanel>
          }
          accessories={[
            {
              text: `gem '${gem.name}', '~> ${gem.version}'`,
            },
          ]}
        />
      </List.Section>
      <List.Section title="Links">
        {mapGemLinks(gem).map((link) => {
          return (
            <List.Item
              title={`Open ${link["title"]}`}
              key={link["title"]}
              icon={Icon.Globe}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open" url={link["link"]} />
                </ActionPanel>
              }
              accessories={[
                {
                  text: link["link"],
                },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
};
