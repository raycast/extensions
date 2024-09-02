import { Prompt } from "../types";
import { Action, ActionPanel, Detail, Image, Icon } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { isImageUrl } from "../utils";

interface Props {
  prompt: Prompt;
}

export const PromptDetail = ({ prompt }: Props) => {
  return (
    <Detail
      navigationTitle={prompt.title}
      // TODO not looking good
      markdown={`
${prompt.content}
      `}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Author"
            text={prompt.author.name}
            icon={{
              source: (isImageUrl(prompt.author.avatar) && prompt.author.avatar) || getAvatarIcon(prompt.author.name),
              mask: Image.Mask.Circle,
            }}
          />
          {prompt.author.url && (
            <Detail.Metadata.Link title="Author URL" target={prompt.author.url} text={prompt.author.url} />
          )}
          <Detail.Metadata.TagList title="Tags">
            {prompt.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
          {prompt.libs.length > 0 && (
            <Detail.Metadata.TagList title="Libraries">
              {prompt.libs.map((lib) => (
                <Detail.Metadata.TagList.Item key={lib} text={lib} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Prompt"
            icon={Icon.Clipboard}
            content={prompt.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Open in Cursor.directory"
            icon={Icon.Link}
            url={`https://cursor.directory/${prompt.slug}`}
          />
          {prompt.author.url && (
            <Action.OpenInBrowser title="Open Author URL" icon={Icon.Person} url={prompt.author.url} />
          )}
          <Action.CopyToClipboard
            title="Share Prompt"
            icon={Icon.Hashtag}
            content={`https://cursor.directory/${prompt.slug}`}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
          />
          {
            // TODO: save to favorites
            // remove from favorites
          }
          {
            // TODO: edit a prompt
          }
          {/* <Action.Push */}
          {/*   title="Create Prompt" */}
          {/*   icon={Icon.Pencil} */}
          {/*   target={<CreatePromptForm />} */}
          {/* /> */}
          {/**/}
        </ActionPanel>
      }
    />
  );
};
