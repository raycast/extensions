import { Clipboard, Detail, showToast, Toast, ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { encode } from "gpt-tokenizer";

interface CountResult {
  lines: number;
  words: number;
  characters: number;
  charactersNoSpaces: number;
  tokensGPT35: number;
  tokensGPT4: number;
  tokensClaude: number;
}

export default function CountText() {
  const [text, setText] = useState<string>("");
  const [counts, setCounts] = useState<CountResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClipboardText();
  }, []);

  async function loadClipboardText() {
    try {
      const clipboardText = await Clipboard.readText();
      if (!clipboardText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No text in clipboard",
          message: "Please copy some text first",
        });
        setText("");
        setCounts(null);
        setIsLoading(false);
        return;
      }

      setText(clipboardText);
      const result = countText(clipboardText);
      setCounts(result);
      setIsLoading(false);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read clipboard",
        message: String(error),
      });
      setText("");
      setCounts(null);
      setIsLoading(false);
    }
  }

  function countText(text: string): CountResult {
    const lines = text.split(/\r\n|\r|\n/).length;
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, "").length;

    let tokensGPT35 = 0;
    let tokensGPT4 = 0;
    let tokensClaude = 0;

    try {
      tokensGPT35 = encode(text).length;
    } catch (e) {
      console.error("Failed to count GPT-3.5 tokens:", e);
    }

    try {
      tokensGPT4 = encode(text).length;
    } catch (e) {
      console.error("Failed to count GPT-4 tokens:", e);
    }

    try {
      tokensClaude = encode(text).length;
    } catch (e) {
      console.error("Failed to count Claude tokens:", e);
    }

    return {
      lines,
      words,
      characters,
      charactersNoSpaces,
      tokensGPT35,
      tokensGPT4,
      tokensClaude,
    };
  }

  async function copyResult(value: string | number, label: string) {
    await Clipboard.copy(String(value));
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${label}`,
      message: `${value} copied to clipboard`,
    });
  }

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!counts) {
    return (
      <Detail
        markdown="# No text in clipboard\n\nPlease copy some text and try again."
        actions={
          <ActionPanel>
            <Action
              title="Refresh from Clipboard"
              icon={Icon.ArrowClockwise}
              onAction={loadClipboardText}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <List>
      <List.Section title="Text Statistics">
        <List.Item
          title="Lines"
          subtitle={formatNumber(counts.lines)}
          icon={Icon.TextCursor}
          accessories={[{ text: `${formatNumber(counts.lines)} lines` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Lines Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.lines, "lines count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Words"
          subtitle={formatNumber(counts.words)}
          icon={Icon.Text}
          accessories={[{ text: `${formatNumber(counts.words)} words` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Words Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.words, "words count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Characters"
          subtitle={formatNumber(counts.characters)}
          icon={Icon.Document}
          accessories={[{ text: `${formatNumber(counts.characters)} chars` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Characters Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.characters, "characters count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Characters (no spaces)"
          subtitle={formatNumber(counts.charactersNoSpaces)}
          icon={Icon.TextInput}
          accessories={[{ text: `${formatNumber(counts.charactersNoSpaces)} chars` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Characters (no spaces) Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.charactersNoSpaces, "characters (no spaces) count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Token Counts">
        <List.Item
          title="GPT-3.5 Tokens"
          subtitle={formatNumber(counts.tokensGPT35)}
          icon={Icon.Coins}
          accessories={[{ text: `${formatNumber(counts.tokensGPT35)} tokens` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy GPT-3.5 Tokens Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.tokensGPT35, "GPT-3.5 tokens count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="GPT-4 Tokens"
          subtitle={formatNumber(counts.tokensGPT4)}
          icon={Icon.Stars}
          accessories={[{ text: `${formatNumber(counts.tokensGPT4)} tokens` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy GPT-4 Tokens Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.tokensGPT4, "GPT-4 tokens count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Claude Tokens"
          subtitle={formatNumber(counts.tokensClaude)}
          icon={Icon.Star}
          accessories={[{ text: `${formatNumber(counts.tokensClaude)} tokens` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Claude Tokens Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.tokensClaude, "Claude tokens count")}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Actions">
        <List.Item
          title="Copy All Statistics"
          subtitle="Copy all counts as formatted text"
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="Copy All Statistics"
                icon={Icon.Clipboard}
                onAction={async () => {
                  const summary = `Lines: ${formatNumber(counts.lines)}
Words: ${formatNumber(counts.words)}
Characters: ${formatNumber(counts.characters)}
Characters (no spaces): ${formatNumber(counts.charactersNoSpaces)}
GPT-3.5 Tokens: ${formatNumber(counts.tokensGPT35)}
GPT-4 Tokens: ${formatNumber(counts.tokensGPT4)}
Claude Tokens: ${formatNumber(counts.tokensClaude)}`;
                  await Clipboard.copy(summary);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Copied all statistics",
                    message: "All counts copied to clipboard",
                  });
                }}
              />
              <Action
                title="Refresh from Clipboard"
                icon={Icon.ArrowClockwise}
                onAction={loadClipboardText}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
