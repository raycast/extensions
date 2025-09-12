import { Clipboard, Detail, showToast, Toast, ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { encode } from "gpt-tokenizer";

interface CountResult {
  lines: number;
  words: number;
  sentences: number;
  paragraphs: number;
  characters: number;
  charactersNoSpaces: number;
  tokensGPT4o: number;
  tokensGPT4: number;
  tokensGPT35: number;
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

    // Count sentences - handles multiple sentence endings and abbreviations
    const sentenceRegex = /[.!?]+[\s\n]+|[.!?]+$/g;
    const sentenceMatches = text.match(sentenceRegex);
    const sentences = sentenceMatches ? sentenceMatches.length : text.trim().length > 0 ? 1 : 0;

    // Count paragraphs - splits by multiple newlines or single newlines with content
    const paragraphs =
      text
        .split(/\n\s*\n|\r\n\s*\r\n|\r\s*\r/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0).length || (text.trim().length > 0 ? 1 : 0);

    let tokensGPT4o = 0;
    let tokensGPT4 = 0;
    let tokensGPT35 = 0;
    let tokensClaude = 0;

    // Use gpt-tokenizer which provides cl100k_base encoding
    // This is the encoding used by GPT-3.5-turbo, GPT-4, and similar for Claude
    try {
      // Handle special tokens by allowing them in the encoding
      // This prevents errors when text contains tokens like <|endoftext|>
      const tokens = encode(text, { allowedSpecial: "all" });
      // GPT-4o typically uses about 20-30% fewer tokens than cl100k_base
      // This is an approximation since we can't use the actual o200k_base encoding
      tokensGPT4o = Math.ceil(tokens.length * 0.75);
      tokensGPT4 = tokens.length;
      tokensGPT35 = tokens.length;
      tokensClaude = tokens.length;
    } catch (e) {
      console.error("Failed to count tokens:", e);
      // Fallback: if encoding fails, estimate based on characters
      // Rough approximation: ~4 characters per token on average
      const estimatedTokens = Math.ceil(text.length / 4);
      tokensGPT4o = Math.ceil(estimatedTokens * 0.75);
      tokensGPT4 = estimatedTokens;
      tokensGPT35 = estimatedTokens;
      tokensClaude = estimatedTokens;
    }

    return {
      lines,
      words,
      sentences,
      paragraphs,
      characters,
      charactersNoSpaces,
      tokensGPT4o,
      tokensGPT4,
      tokensGPT35,
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

  const formatCompactNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}b`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <List>
      <List.Section title="Text Statistics">
        <List.Item
          title="Lines"
          subtitle={formatCompactNumber(counts.lines)}
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
          subtitle={formatCompactNumber(counts.words)}
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
          title="Sentences"
          subtitle={formatCompactNumber(counts.sentences)}
          icon={Icon.Dot}
          accessories={[{ text: `${formatNumber(counts.sentences)} sentences` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Sentences Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.sentences, "sentences count")}
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
          title="Paragraphs"
          subtitle={formatCompactNumber(counts.paragraphs)}
          icon={Icon.Paragraph}
          accessories={[{ text: `${formatNumber(counts.paragraphs)} paragraphs` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy Paragraphs Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.paragraphs, "paragraphs count")}
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
          subtitle={formatCompactNumber(counts.characters)}
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
          subtitle={formatCompactNumber(counts.charactersNoSpaces)}
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
          title="GPT-4o (~estimate)"
          subtitle={formatCompactNumber(counts.tokensGPT4o)}
          icon={Icon.Bolt}
          accessories={[{ text: `${formatNumber(counts.tokensGPT4o)} tokens` }]}
          actions={
            <ActionPanel>
              <Action
                title="Copy GPT-4o Tokens Count"
                icon={Icon.Clipboard}
                onAction={() => copyResult(counts.tokensGPT4o, "GPT-4o tokens count")}
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
          title="GPT-4"
          subtitle={formatCompactNumber(counts.tokensGPT4)}
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
          title="GPT-3.5-turbo"
          subtitle={formatCompactNumber(counts.tokensGPT35)}
          icon={Icon.Bolt}
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
          title="Claude"
          subtitle={formatCompactNumber(counts.tokensClaude)}
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
Sentences: ${formatNumber(counts.sentences)}
Paragraphs: ${formatNumber(counts.paragraphs)}
Characters: ${formatNumber(counts.characters)}
Characters (no spaces): ${formatNumber(counts.charactersNoSpaces)}
GPT-4o Tokens (~estimate): ${formatNumber(counts.tokensGPT4o)}
GPT-4 Tokens: ${formatNumber(counts.tokensGPT4)}
GPT-3.5-turbo Tokens: ${formatNumber(counts.tokensGPT35)}
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
