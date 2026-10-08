import { useState, useEffect } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
  open,
  useNavigation,
} from "@raycast/api";
import {
  synthesizeCompanion,
  getBadgeMarkdown,
  formatToSpecV2,
  LINTEN_CLOUD_BASE,
  SynthesizeReport,
  isValidUrlInput,
  isLocalOrInternalUrl,
} from "./api";

export function CompiledArchiveView({
  target,
  report,
}: {
  target: string;
  report: SynthesizeReport;
}) {
  const { pop } = useNavigation();
  const metrics = report.metrics;
  const tokenCount = metrics?.estimatedTokens || 0;

  async function handleFormatMarkdown() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Formatting to Spec v2...",
      message: "Normalizing AST headings, bullets, and link lines",
    });

    try {
      let rawText = target;
      const isUrl = isValidUrlInput(target);
      if (isUrl) {
        let cleanUrl = target.trim();
        if (
          !cleanUrl.startsWith("http://") &&
          !cleanUrl.startsWith("https://")
        ) {
          cleanUrl = "https://" + cleanUrl;
        }
        if (!cleanUrl.endsWith("/llms.txt") && !cleanUrl.includes("llms.txt")) {
          cleanUrl = cleanUrl.replace(/\/$/, "") + "/llms.txt";
        }
        if (isLocalOrInternalUrl(cleanUrl)) {
          throw new Error(
            "Local and private network URLs cannot be loaded. Please paste markdown directly.",
          );
        }
        const resp = await fetch(cleanUrl, {
          headers: {
            "User-Agent": "Linten-Raycast/1.0 (+https://loopstates.com)",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok)
          throw new Error(`Could not fetch ${cleanUrl} (HTTP ${resp.status})`);
        rawText = await resp.text();
      }

      const formatted = formatToSpecV2(rawText);
      await Clipboard.copy(formatted);
      toast.style = Toast.Style.Success;
      toast.title = "Formatted to Spec v2";
      toast.message = "Canonical markdown copied to clipboard";
    } catch (err: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Formatting Failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  const archiveActions = (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Full llms-full.txt"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        content={report.fullContent || ""}
      />
      <Action
        title="Format Markdown to Spec v2"
        icon={Icon.WrenchScrewdriver}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
        onAction={handleFormatMarkdown}
      />
      {isValidUrlInput(target) && (
        <>
          <Action.CopyToClipboard
            title="Copy Spec v2 Badge Code"
            icon={Icon.Tag}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            content={getBadgeMarkdown(target)}
          />
          <Action
            title="Open in Linten Web Inspector"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
            onAction={() =>
              open(`${LINTEN_CLOUD_BASE}/?url=${encodeURIComponent(target)}`)
            }
          />
        </>
      )}
      <Action
        title="Compile Another Target"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
        onAction={pop}
      />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={true}
      searchBarPlaceholder="Search compiled archive..."
      actions={archiveActions}
    >
      <List.Section title="Compiled Companion Archive">
        <List.Item
          id="compiled-output"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="llms-full.txt (Copied to Clipboard)"
          subtitle={`${report.linkCount || 0} links bundled (~${tokenCount.toLocaleString()} tokens)`}
          accessories={[
            {
              tag: {
                value: `${tokenCount.toLocaleString()} tokens`,
                color: Color.Green,
              },
            },
          ]}
          actions={archiveActions}
          detail={
            <List.Item.Detail
              markdown={`# Linten Companion Archive (llms-full.txt)\n\n**Source**: \`${target}\`\n\n**Status**: Successfully compiled and copied to clipboard.\n\n---\n\n\`\`\`markdown\n${report.fullContent && report.fullContent.length > 800 ? report.fullContent.slice(0, 800) + "\n\n... [Remaining content in clipboard]" : report.fullContent || ""}\n\`\`\``}
              metadata={
                metrics ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Status">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Copied to Clipboard"
                        color={Color.Green}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Bundled Links"
                      text={String(report.linkCount || 0)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Estimated Tokens"
                      text={`~${tokenCount.toLocaleString()} tokens`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Total Words"
                      text={metrics.wordCount.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Character Count"
                      text={metrics.characterCount.toLocaleString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.TagList title="Context Window Fit">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="GPT-4o (128k)"
                        color={metrics.fitsGpt4o ? Color.Green : Color.Red}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Claude 3.5 (200k)"
                        color={
                          metrics.fitsClaudeSonnet ? Color.Green : Color.Red
                        }
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="Gemini 2.0 (1M)"
                        color={metrics.fitsGemini ? Color.Green : Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Powered by"
                      target="https://loopstates.com"
                      text="Loopstates"
                    />
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
        />
        {isValidUrlInput(target) && (
          <List.Item
            id="compiled-badge"
            icon={{ source: Icon.Tag, tintColor: Color.Blue }}
            title="Official Spec v2 Badge"
            subtitle="Live shields badge code for README.md"
            accessories={[{ text: "Press ↵ to copy code" }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Spec v2 Badge Code"
                  icon={Icon.Tag}
                  content={getBadgeMarkdown(target)}
                />
                <Action
                  title="Open in Linten Web Inspector"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() =>
                    open(
                      `${LINTEN_CLOUD_BASE}/?url=${encodeURIComponent(target)}`,
                    )
                  }
                />
                <Action.CopyToClipboard
                  title="Copy Full llms-full.txt"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  content={report.fullContent || ""}
                />
                <Action
                  title="Compile Another Target"
                  icon={Icon.ArrowLeft}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={pop}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`# Spec v2 Compliance Badge\n\nAdd this real-time badge to your \`README.md\`:\n\n\`\`\`markdown\n${getBadgeMarkdown(target)}\n\`\`\`\n\n### HTML Snippet\n\`\`\`html\n<a href="${LINTEN_CLOUD_BASE}"><img src="${LINTEN_CLOUD_BASE}/badge?domain=${encodeURIComponent(
                  target
                    .replace(/^https?:\/\//i, "")
                    .replace(/\/.*$/, "")
                    .trim(),
                )}" alt="llms.txt" /></a>\n\`\`\`\n\nPress **Return (↵)** to copy the Markdown snippet to your clipboard.`}
              />
            }
          />
        )}
      </List.Section>
    </List>
  );
}

export default function CompileCommand() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState<string>("");
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function checkClipboard() {
      try {
        const clip = await Clipboard.readText();
        if (clip && clip.trim().length > 0) {
          setClipboardContent(clip.trim());
          if (!searchText.trim()) {
            setSelectedItemId("clip-target");
          }
        }
      } catch {
        // Clipboard read error is non-fatal
      }
    }
    checkClipboard();
  }, []);

  function handleSearchTextChange(text: string) {
    setSearchText(text);
    if (text.trim().length > 0) {
      setSelectedItemId("search-target");
    } else if (clipboardContent) {
      setSelectedItemId("clip-target");
    }
  }

  async function runCompile(input: string) {
    const trimmed = input.trim();
    if (!trimmed) {
      showToast({
        style: Toast.Style.Failure,
        title: "Input Required",
        message: "Enter a valid URL or paste markdown.",
      });
      return;
    }

    if (
      trimmed.startsWith("/") ||
      trimmed.startsWith("~") ||
      trimmed.startsWith("file://")
    ) {
      showToast({
        style: Toast.Style.Failure,
        title: "Local Path Not Supported",
        message:
          "Linten Cloud compiles remote URLs (e.g. acme.com/llms.txt) or markdown text, not local filesystem paths.",
      });
      return;
    }

    setLoading(true);

    const isUrl = isValidUrlInput(trimmed);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Synthesizing llms-full.txt...",
      message: "Fetching clean documentation from declared links",
    });

    try {
      let cleanUrl = trimmed;
      if (isUrl) {
        if (
          !cleanUrl.startsWith("http://") &&
          !cleanUrl.startsWith("https://")
        ) {
          cleanUrl = "https://" + cleanUrl;
        }
        if (!cleanUrl.endsWith("/llms.txt") && !cleanUrl.includes("llms.txt")) {
          cleanUrl = cleanUrl.replace(/\/$/, "") + "/llms.txt";
        }
      }

      const res = await synthesizeCompanion(
        isUrl ? { url: cleanUrl } : { content: trimmed },
      );

      if (!res.ok || !res.fullContent) {
        throw new Error(res.error || "Failed to synthesize companion archive.");
      }

      toast.style = Toast.Style.Success;
      toast.title = "llms-full.txt Compiled";
      const tokenCount = res.metrics?.estimatedTokens || 0;
      toast.message = `Bundled ${res.linkCount || 0} links (~${tokenCount.toLocaleString()} tokens)`;

      // Push result view onto Raycast navigation stack so the window stays firmly open
      push(<CompiledArchiveView target={cleanUrl} report={res} />);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Synthesis Failed";
      if (msg.includes("No valid documentation links found")) {
        toast.message =
          "This llms.txt has no documentation links (- [Title](url)) to bundle into llms-full.txt.";
      } else {
        toast.message = msg;
      }
    } finally {
      setLoading(false);
    }
  }

  const initialActions = (
    <ActionPanel>
      <Action
        title="Compile Companion"
        icon={Icon.Document}
        onAction={() => {
          if (!searchText.trim()) {
            showToast({
              style: Toast.Style.Failure,
              title: "Input Required",
              message:
                "Enter a valid URL (e.g. acme.com/llms.txt) or paste markdown in search bar.",
            });
            return;
          }
          runCompile(searchText.trim());
        }}
      />
      {clipboardContent && (
        <Action
          title="Compile from Clipboard"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => runCompile(clipboardContent)}
        />
      )}
    </ActionPanel>
  );

  const isTyping = searchText.trim().length > 0;

  return (
    <List
      isLoading={loading}
      filtering={false}
      searchBarPlaceholder="Enter URL (e.g. acme.com/llms.txt) or paste markdown..."
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      actions={initialActions}
    >
      <List.EmptyView
        icon={Icon.Document}
        title="Enter an llms.txt URL or paste markdown"
        description="Type in the search bar above to compile companion llms-full.txt to your clipboard."
      />
      {isTyping && (
        <List.Section title="Typed Target">
          <List.Item
            id="search-target"
            icon={Icon.MagnifyingGlass}
            title={`Compile "${searchText.trim()}"`}
            subtitle="Press Enter to bundle companion archive"
            actions={
              <ActionPanel>
                <Action
                  title="Compile Typed Target"
                  icon={Icon.Check}
                  onAction={() => runCompile(searchText.trim())}
                />
                {isValidUrlInput(searchText) && (
                  <Action.CopyToClipboard
                    title="Copy Spec v2 Badge Code"
                    icon={Icon.Tag}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                    content={getBadgeMarkdown(searchText)}
                  />
                )}
                {clipboardContent && (
                  <Action
                    title="Compile from Clipboard"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => runCompile(clipboardContent)}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {clipboardContent ? (
        <List.Section title="Clipboard">
          <List.Item
            id="clip-target"
            icon={Icon.Clipboard}
            title="Compile from Clipboard"
            subtitle={
              clipboardContent.length > 60
                ? clipboardContent.slice(0, 60) + "..."
                : clipboardContent
            }
            accessories={[{ tag: { value: "Clipboard", color: Color.Blue } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Compile Clipboard Target"
                  icon={Icon.Check}
                  onAction={() => runCompile(clipboardContent)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
