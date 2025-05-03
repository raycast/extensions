import { Action, ActionPanel, Clipboard, Color, getPreferenceValues, List, LaunchProps, Icon } from "@raycast/api";
import { GitmojiListItemProps, CommitMessageItemProps, gitmojis } from "./lib/types";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { getCommitMessage } from "./lib/utils";

interface SearchCommitTypeArgs {
  commitMessage: string;
}

function getMultiCommitMessage(input: string) {
  const { candidateCount } = getPreferenceValues<Preferences.SearchCommitType>();
  const count = candidateCount ? parseInt(candidateCount) : 1;
  return Promise.all(Array.from({ length: count }, () => getCommitMessage(input)));
}

export default function SearchCommitType(props: LaunchProps<{ arguments: SearchCommitTypeArgs }>) {
  const [input, setInput] = useState(props.arguments.commitMessage);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data: commitMessages } = usePromise(getMultiCommitMessage, [input]);

  return (
    <List
      searchBarPlaceholder={props.arguments.commitMessage || "Search your gitmoji..."}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchText={input}
      onSearchTextChange={setInput}
      onSelectionChange={(id) => {
        setIsShowingDetail(id?.startsWith("message-") || false);
      }}
      throttle={true}
    >
      {input && (
        <List.Section title="Commit Message">
          {isLoading || !commitMessages ? (
            <List.Item
              id="generating-commit-message-loading"
              icon={Icon.CircleProgress}
              title="Generating commit message..."
            />
          ) : (
            commitMessages
              .filter((commitMessage) => commitMessage !== undefined)
              .map((commitMessage, index) => (
                <CommitMessageItem
                  id={`message-${input}-${index}`}
                  key={`message-${input}-${index}`}
                  commitMessage={commitMessage}
                  onRegenerate={() => {
                    setInput(commitMessage);
                  }}
                />
              ))
          )}
        </List.Section>
      )}
      <List.Section title="Gitmoji">
        {gitmojis.map((gitmoji) => (
          <GitmojiListItem id={gitmoji.name} key={gitmoji.name} gitmoji={gitmoji} />
        ))}
      </List.Section>
    </List>
  );
}

function CommitMessageItem({ id, commitMessage, onRegenerate }: CommitMessageItemProps) {
  const { model, language } = getPreferenceValues<Preferences.SearchCommitType>();

  return (
    <List.Item
      id={id}
      title={commitMessage}
      icon={Icon.Message}
      detail={
        <List.Item.Detail
          markdown={`**${commitMessage}**`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Model" text={`${model}`} />
              <List.Item.Detail.Metadata.Label title="Language" text={`${language}`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <PrimaryAction content={commitMessage} />
          <ActionPanel.Section>
            <Action
              title="Regenerate Commit Message"
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => {
                onRegenerate();
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={commitMessage}
              title="Copy Commit Type"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.Paste
              content={commitMessage}
              title="Paste Commit Type"
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function GitmojiListItem({ gitmoji }: GitmojiListItemProps) {
  const { name, desc, emoji, code, type } = gitmoji;
  const { emojiFormat, copyFormat, terminator } = getPreferenceValues<Preferences.SearchCommitType>();

  let emojiText = emojiFormat === "emoji" ? emoji : code;

  if (copyFormat === "emoji-type") {
    emojiText = `${emojiText} ${type}`;
  }

  return (
    <List.Item
      id={`gitmoji-${name}`}
      title={desc}
      icon={emoji}
      accessories={[{ tag: { value: `${emojiText}${terminator}...`, color: Color.Yellow } }]}
      keywords={[code.replace(":", ""), name]}
      actions={
        <ActionPanel>
          <PrimaryAction content={`${emojiText}${terminator}`} />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={`${emojiText}${terminator}`}
              title="Copy Commit Type"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Paste
              content={`${emojiText}${terminator}`}
              title="Paste Commit Type"
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface PrimaryActionProps {
  content: string;
}

function PrimaryAction({ content }: PrimaryActionProps) {
  const { action } = getPreferenceValues<Preferences.SearchCommitType>();

  if (action === "copy") {
    return <Action.CopyToClipboard content={content} />;
  } else if (action === "paste") {
    return <Action.Paste content={content} />;
  } else {
    Clipboard.copy(content);
    return <Action.Paste content={content} />;
  }
}
