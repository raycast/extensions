import { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  List,
  showToast,
  Toast,
  LocalStorage,
  popToRoot,
  clearSearchBar,
} from "@raycast/api";
import { prefixes, Gitmoji, gitmojis, BranchPrefix } from "./constants";

interface PreferenceValues {
  copy: "prefix-emoji" | "prefix-emoji-description" | "prefix" | "emoji";
  action: "paste" | "copy";
  closeExtension: boolean;
}

const Main = () => {
  const [prefix, setPrefix] = useState<string | undefined>(undefined);

  const handleSetPrefix = async (prefix: string) => {
    setPrefix(prefix);
    await clearSearchBar();
  };

  if (!gitmojis || gitmojis.length === 0) {
    showToast({
      title: "Failed to fetch latest gitmojis",
      message: "Using saved gitmojis as fallback",
      style: Toast.Style.Failure,
    });
  }

  if (prefix) {
    return (
      <List searchBarPlaceholder="Choose a gitmoji">
        {gitmojis.map((gitmoji) => (
          <GitmojiListItem key={gitmoji.name} gitmoji={gitmoji} prefix={prefix} />
        ))}
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Select the type of change that you are committing">
      {prefixes.map((prefix) => (
        <PrefixListItem key={prefix.name} prefix={prefix} setPrefix={handleSetPrefix} />
      ))}
    </List>
  );
};

const PrefixListItem = ({
  prefix,
  setPrefix,
}: {
  prefix: BranchPrefix;
  setPrefix: (prefix: string) => Promise<void>;
}) => {
  const { name, description } = prefix;

  return (
    <List.Item
      id={name}
      key={name}
      // title={`${name}: ${description}`}
      title={description}
      icon={`../assets/${name}.png`}
      accessories={[{ tag: { value: `${name}:`, color: Color.Orange } }]}
      keywords={[name]}
      actions={
        <ActionPanel>
          <Action title="Continue Picking an Emoji" onAction={() => setPrefix(prefix.name)} />

          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={`${prefix.name}:`}
              title="Copy Prefix"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => saveLatestCommit(`${prefix.name}:`)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Paste
              content={`${prefix.name}:`}
              title="Paste Prefix"
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onPaste={() => saveLatestCommit(`${prefix.name}:`)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const GitmojiListItem = ({ gitmoji, prefix }: { gitmoji: Gitmoji; prefix: string }) => {
  const { name, description, emoji, code } = gitmoji;
  const { copy } = getPreferenceValues<PreferenceValues>();

  return (
    <List.Item
      id={name}
      key={name}
      title={description}
      icon={emoji}
      accessories={emoji ? [{ tag: { value: code, color: Color.Blue } }] : []}
      keywords={[code.replace(":", ""), name]}
      actions={
        <ActionPanel>
          {copy === "prefix-emoji" && <PrimaryAction content={`${prefix}: ${emoji}`} />}
          {copy === "prefix-emoji-description" && <PrimaryAction content={`${prefix}: ${emoji} ${description} `} />}
          {copy === "prefix" && <PrimaryAction content={`${prefix}:`} />}
          {copy === "emoji" && <PrimaryAction content={`${emoji}`} />}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              content={`${prefix}: ${emoji}`}
              title="Copy Prefix + Copy Emoji"
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onCopy={() => saveLatestCommit(`${prefix}: ${emoji} `)}
            />
            <Action.CopyToClipboard
              content={`${prefix}: ${emoji} ${description} `}
              title="Copy Prefix + Copy Emoji + Copy Description"
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
              onCopy={() => saveLatestCommit(`${prefix}: ${emoji} ${description} `)}
            />
            <Action.CopyToClipboard
              content={`${prefix}:`}
              title="Copy Prefix "
              shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
              onCopy={() => saveLatestCommit(`${prefix}: `)}
            />
            <Action.CopyToClipboard
              content={`${emoji}`}
              title="Copy Emoji"
              shortcut={{ modifiers: ["ctrl", "opt"], key: "c" }}
              onCopy={() => saveLatestCommit(`${emoji} `)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action.Paste
              content={`${prefix}: ${emoji}`}
              title="Paste Prefix + Paste Emoji"
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onPaste={() => saveLatestCommit(`${prefix}: ${emoji} `)}
            />
            <Action.Paste
              content={`${prefix}: ${emoji} ${description} `}
              title="Paste Emoji"
              shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
              onPaste={() => saveLatestCommit(`${prefix}: ${emoji} ${description} `)}
            />
            <Action.Paste
              content={`${prefix}:`}
              title="Paste Prefix"
              shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
              onPaste={() => saveLatestCommit(`${prefix}:`)}
            />
            <Action.Paste
              content={`${emoji}`}
              title="Paste Emoji"
              shortcut={{ modifiers: ["ctrl", "opt"], key: "p" }}
              onPaste={() => saveLatestCommit(`${emoji}`)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const PrimaryAction = ({ content }: { content: string }) => {
  const { action } = getPreferenceValues<PreferenceValues>();

  if (action === "copy") {
    return <Action.CopyToClipboard content={content} onCopy={() => saveLatestCommit(content)} />;
  } else {
    return <Action.Paste content={content} onPaste={() => saveLatestCommit(content)} />;
  }
};

const saveLatestCommit = async (commit: string) => {
  const { closeExtension } = getPreferenceValues<PreferenceValues>();
  console.log("Saved latest commit to local storage", commit);
  if (closeExtension) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for the window to close before going back to the root
    await popToRoot({ clearSearchBar: true });
  }
  await LocalStorage.setItem("latest-commit", commit);
};

export const getLatestCommit = async (): Promise<string | number | undefined> => {
  return (await LocalStorage.getItem("latest-commit")) ?? undefined;
};

export default Main;
