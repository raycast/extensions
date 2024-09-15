import { CursorRule } from "../types";
import { Action, ActionPanel, Detail, Image, Icon, openExtensionPreferences, showHUD, Clipboard } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { isImageUrl, processContent } from "../utils";

interface Props {
  cursorRule: CursorRule;
  popularOnly: boolean;
}

export const CursorRuleDetail = ({ cursorRule, popularOnly }: Props) => {
  return (
    <Detail
      navigationTitle={cursorRule.title}
      markdown={processContent(cursorRule.content)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Author"
            text={cursorRule.author.name}
            icon={{
              source:
                (isImageUrl(cursorRule.author.avatar) && cursorRule.author.avatar) ||
                getAvatarIcon(cursorRule.author.name),
              mask: Image.Mask.Circle,
            }}
          />
          {cursorRule.author.url && (
            <Detail.Metadata.Link title="Author URL" target={cursorRule.author.url} text={cursorRule.author.url} />
          )}
          {popularOnly && cursorRule.count && (
            <Detail.Metadata.Label
              title="Used by"
              text={cursorRule.count > 1 ? `${cursorRule.count} people` : `${cursorRule.count} person`}
            />
          )}
          <Detail.Metadata.TagList title="Tags">
            {cursorRule.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
          {cursorRule.libs.length > 0 && (
            <Detail.Metadata.TagList title="Libraries">
              {cursorRule.libs.map((lib) => (
                <Detail.Metadata.TagList.Item key={lib} text={lib} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action
              title="Copy Cursor Rule"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(cursorRule.content);
                await showHUD("Copied to clipboard, paste it into .cursorrules file");
              }}
            />
            <Action.OpenInBrowser
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Open in cursor.directory"
              icon={Icon.Link}
              url={`https://cursor.directory/${cursorRule.slug}`}
            />
            {cursorRule.author.url && (
              <Action.OpenInBrowser title="Open Author URL" icon={Icon.Person} url={cursorRule.author.url} />
            )}
            <Action.CopyToClipboard
              title="Share Cursor Rule"
              icon={Icon.Hashtag}
              content={`https://cursor.directory/${cursorRule.slug}`}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Settings">
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
