import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  Image,
  Toast,
  showToast,
  openExtensionPreferences,
  getPreferenceValues,
  Keyboard,
} from "@raycast/api";
import { useState, useCallback, useRef } from "react";
import { RankedFileResult, AgentState, AgentStep } from "./lib/types";
import { runAgent, AgentSession } from "./lib/agent";

// ─── Media Type Detection ────────────────────────────────────

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "heic",
  "heif",
  "svg",
  "ico",
]);
const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "wmv",
  "flv",
  "webm",
  "m4v",
  "mpg",
  "mpeg",
  "3gp",
]);
const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "aac",
  "flac",
  "ogg",
  "wma",
  "m4a",
  "aiff",
  "alac",
  "opus",
]);

function isImageFile(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

function isMediaFile(ext: string): boolean {
  const lower = ext.toLowerCase();
  return (
    IMAGE_EXTENSIONS.has(lower) ||
    VIDEO_EXTENSIONS.has(lower) ||
    AUDIO_EXTENSIONS.has(lower)
  );
}

// ─── File Type Icons ─────────────────────────────────────────

function getFileIcon(file: RankedFileResult): Image.ImageLike {
  // For image files, use the actual file as thumbnail
  if (isImageFile(file.extension)) {
    return { source: file.path };
  }

  const iconMap: Record<string, { source: Icon; tintColor: Color }> = {
    xlsx: { source: Icon.Document, tintColor: Color.Green },
    xls: { source: Icon.Document, tintColor: Color.Green },
    csv: { source: Icon.Document, tintColor: Color.Green },
    numbers: { source: Icon.Document, tintColor: Color.Green },
    pdf: { source: Icon.Document, tintColor: Color.Red },
    docx: { source: Icon.Document, tintColor: Color.Blue },
    doc: { source: Icon.Document, tintColor: Color.Blue },
    pages: { source: Icon.Document, tintColor: Color.Blue },
    pptx: { source: Icon.Document, tintColor: Color.Orange },
    ppt: { source: Icon.Document, tintColor: Color.Orange },
    keynote: { source: Icon.Document, tintColor: Color.Orange },
    txt: { source: Icon.TextDocument, tintColor: Color.SecondaryText },
    md: { source: Icon.TextDocument, tintColor: Color.SecondaryText },
    json: { source: Icon.Code, tintColor: Color.Yellow },
    js: { source: Icon.Code, tintColor: Color.Yellow },
    ts: { source: Icon.Code, tintColor: Color.Blue },
    py: { source: Icon.Code, tintColor: Color.Blue },
    go: { source: Icon.Code, tintColor: Color.Magenta },
    java: { source: Icon.Code, tintColor: Color.Red },
    html: { source: Icon.Code, tintColor: Color.Orange },
    css: { source: Icon.Code, tintColor: Color.Purple },
    svg: { source: Icon.Image, tintColor: Color.Magenta },
    zip: { source: Icon.Box, tintColor: Color.SecondaryText },
    sql: { source: Icon.Code, tintColor: Color.Purple },
    log: { source: Icon.TextDocument, tintColor: Color.SecondaryText },
    // Video
    mp4: { source: Icon.Video, tintColor: Color.Purple },
    mov: { source: Icon.Video, tintColor: Color.Purple },
    avi: { source: Icon.Video, tintColor: Color.Purple },
    mkv: { source: Icon.Video, tintColor: Color.Purple },
    webm: { source: Icon.Video, tintColor: Color.Purple },
    // Audio
    mp3: { source: Icon.Music, tintColor: Color.Orange },
    wav: { source: Icon.Music, tintColor: Color.Orange },
    aac: { source: Icon.Music, tintColor: Color.Orange },
    flac: { source: Icon.Music, tintColor: Color.Orange },
    m4a: { source: Icon.Music, tintColor: Color.Orange },
    ogg: { source: Icon.Music, tintColor: Color.Orange },
  };

  return (
    iconMap[file.extension] || {
      source: Icon.Document,
      tintColor: Color.PrimaryText,
    }
  );
}

/**
 * Build detail markdown for a file result.
 * Shows image preview for image files, and media type badge for videos/audio.
 */
function buildFileDetailMarkdown(file: RankedFileResult): string {
  const lines: string[] = [];

  lines.push(`## ${file.name}`);
  lines.push("");

  // Image preview
  if (isImageFile(file.extension)) {
    lines.push(`![${file.name}](${encodeURI(file.path)}?raycast-height=200)`);
    lines.push("");
  }

  // Media badge
  if (VIDEO_EXTENSIONS.has(file.extension.toLowerCase())) {
    lines.push(`> 🎬 **Video File**`);
    lines.push("");
  } else if (AUDIO_EXTENSIONS.has(file.extension.toLowerCase())) {
    lines.push(`> 🎵 **Audio File**`);
    lines.push("");
  }

  lines.push(`**Why this might be it:**`);
  lines.push(file.matchReason);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Path | \`${shortenPath(file.path)}\` |`);
  lines.push(`| Type | .${file.extension} |`);
  lines.push(`| Size | ${file.sizeFormatted} |`);
  lines.push(`| Modified | ${formatDate(file.modifiedAt)} |`);
  lines.push(`| Created | ${formatDate(file.createdAt)} |`);
  lines.push(`| Relevance | ${file.relevanceScore}% |`);

  return lines.join("\n");
}

// ─── Format Date ─────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Shorten Path ────────────────────────────────────────────

function shortenPath(path: string | undefined): string {
  if (!path) return "(unknown)";
  const home = process.env.HOME || "";
  if (path.startsWith(home)) {
    return "~" + path.slice(home.length);
  }
  return path;
}

// ─── Step Icon ───────────────────────────────────────────────

function getStepIcon(step: AgentStep): { source: Icon; tintColor: Color } {
  switch (step.type) {
    case "thinking":
      return { source: Icon.Stars, tintColor: Color.Purple };
    case "tool_call":
      return { source: Icon.Gear, tintColor: Color.Blue };
    case "tool_result":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "answer":
      return { source: Icon.SpeechBubbleActive, tintColor: Color.Green };
    case "error":
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

// ─── Main Command ────────────────────────────────────────────

export default function RecallFileCommand() {
  const [state, setState] = useState<AgentState>({
    phase: "idle",
    query: "",
    steps: [],
    summary: "",
    results: [],
    clarifyingQuestions: [],
    error: null,
  });
  const [searchText, setSearchText] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<AgentSession | null>(null);

  // Check if API key is configured
  const preferences = getPreferenceValues<Preferences.RecallFile>();
  if (!preferences.apiKey) {
    return (
      <Detail
        markdown={`# API Key Required

Please configure your OpenAI-compatible API key in the extension preferences to use File Recall.

Go to **Extension Preferences** to set:
- **API Key** (required)
- **API Base URL** (default: OpenAI)
- **Model** (default: gpt-4o-mini)`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  // ─── Search Handler ──────────────────────────────────────

  const handleSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) return;

    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Detect multi-turn: if query contains "；" or ";", it's a refinement
    const isRefinement =
      sessionRef.current !== null &&
      (query.includes("；") || query.includes(";"));

    // For refinement, pass the previous session
    const previousSession = isRefinement ? sessionRef.current ?? undefined : undefined;

    if (!isRefinement) {
      // Fresh search: clear session
      sessionRef.current = null;
    }

    setState({
      phase: "thinking",
      query,
      steps: [],
      summary: "",
      results: [],
      clarifyingQuestions: [],
      error: null,
    });

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: isRefinement ? "Refining search..." : "Agent is thinking...",
      });

      const result = await runAgent(
        query,
        (step: AgentStep) => {
          setState((prev) => {
            const lastStep = prev.steps[prev.steps.length - 1];

            // Merge consecutive "thinking" steps into one to avoid UI fragmentation.
            // This handles streaming chunks and keeps the thinking view clean.
            if (
              step.type === "thinking" &&
              lastStep?.type === "thinking" &&
              !lastStep.toolName &&
              !step.toolName
            ) {
              // If the new content is a short fragment (streaming chunk),
              // append it to the previous thinking step
              if (step.content.length < 20 && step.content !== "Analyzing...") {
                const merged = [...prev.steps];
                merged[merged.length - 1] = {
                  ...lastStep,
                  content: lastStep.content + step.content,
                };
                return { ...prev, steps: merged };
              }

              // If it's the full response (longer text that supersedes "Analyzing..."),
              // replace the "Analyzing..." placeholder
              if (lastStep.content === "Analyzing...") {
                const merged = [...prev.steps];
                merged[merged.length - 1] = step;
                return { ...prev, steps: merged };
              }
            }

            return { ...prev, steps: [...prev.steps, step] };
          });

          // Update toast based on step type
          if (step.type === "tool_call") {
            showToast({ style: Toast.Style.Animated, title: step.content });
          }
        },
        abortControllerRef.current.signal,
        previousSession,
      );

      // Save session for potential multi-turn continuation
      sessionRef.current = result.session;

      if (result.files.length === 0) {
        setState((prev) => ({
          ...prev,
          phase: "not_found",
          summary: result.summary,
          clarifyingQuestions: result.clarifyingQuestions,
        }));
        await showToast({
          style: Toast.Style.Failure,
          title: "No files found",
        });
      } else {
        setState((prev) => ({
          ...prev,
          phase: "results",
          results: result.files,
          summary: result.summary,
          clarifyingQuestions: result.clarifyingQuestions,
        }));
        await showToast({
          style: Toast.Style.Success,
          title: `Found ${result.files.length} possible matches`,
        });
      }
    } catch (error) {
      // Handle abort errors — show whatever partial state we have
      const isAbort =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error &&
          (error.message.includes("abort") ||
            error.message.includes("cancel")));

      if (isAbort) {
        setState((prev) => {
          // If we already have results from a previous search, keep them
          if (prev.results.length > 0) {
            return {
              ...prev,
              phase: "results",
              summary: prev.summary || "Search was stopped.",
            };
          }
          // Otherwise go back to idle so user can try again
          return {
            ...prev,
            phase: "idle",
          };
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Search stopped",
        });
        return;
      }

      const msg =
        error instanceof Error ? error.message : "Unknown error occurred";
      setState((prev) => ({
        ...prev,
        phase: "idle",
        error: msg,
      }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: msg,
      });
    }
  }, []);

  // ─── Stop Search Handler ─────────────────────────────────

  const handleStopSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    showToast({ style: Toast.Style.Success, title: "Search stopped" });
  }, []);

  // ─── "Answer clarifying question" handler ───────────────

  const handleAnswerQuestion = useCallback(() => {
    setSearchText((prev) => {
      const text = prev.trim();
      if (text.endsWith("；") || text.endsWith(";")) {
        return text;
      }
      return text + "；";
    });
  }, []);

  // ─── "Similar to this" handler ─────────────────────────

  const handleSimilar = useCallback(
    async (file: RankedFileResult) => {
      const refinedQuery = `${state.query} (similar to: ${file.name})`;
      setSearchText(refinedQuery);
      await handleSearch(refinedQuery);
    },
    [state.query, handleSearch],
  );

  // ─── "Not this" handler ────────────────────────────────

  const handleNotThis = useCallback((file: RankedFileResult) => {
    setState((prev) => ({
      ...prev,
      results: prev.results.filter((r) => r.path !== file.path),
    }));
    showToast({ style: Toast.Style.Success, title: "Removed from results" });
  }, []);

  // ─── "Only this type" handler ──────────────────────────

  const handleOnlyThisType = useCallback(
    async (file: RankedFileResult) => {
      const typeQuery = `${state.query} (file type: .${file.extension})`;
      setSearchText(typeQuery);
      await handleSearch(typeQuery);
    },
    [state.query, handleSearch],
  );

  // ─── Build Thinking Markdown ───────────────────────────

  function renderThinkingMarkdown(): string {
    if (state.steps.length === 0) return "";

    const lines: string[] = [];
    for (const step of state.steps) {
      switch (step.type) {
        case "thinking":
          lines.push(`**Thinking:** ${step.content}`);
          break;
        case "tool_call":
          lines.push(`**Tool:** ${step.content}`);
          break;
        case "tool_result":
          lines.push(`**Result:** ${step.content}`);
          break;
        case "error":
          lines.push(`**Error:** ${step.content}`);
          break;
        case "answer":
          lines.push(`**Summary:** ${step.content}`);
          break;
      }
    }
    return lines.join("\n\n");
  }

  // ─── Render ────────────────────────────────────────────

  // Not found state
  if (state.phase === "not_found") {
    const thinkingSection =
      state.steps.length > 0
        ? `\n\n---\n\n### Agent Thinking Process (${state.steps.length} steps)\n\n${renderThinkingMarkdown()}`
        : "";

    const notFoundMd = `# No matching files found

${state.summary || "The agent could not find files matching your description."}
${thinkingSection}

---

**Possible reasons:**
- File type might be different from what you remember
- The actual purpose or content might differ
- Time might be earlier than you recall
- File might have been moved or deleted
- Search directories might not cover the right path

**Try:**
- Describe the file differently
- Add more details (time, purpose, file type)
- Check Search Directories in Preferences`;

    return (
      <Detail
        markdown={notFoundMd}
        actions={
          <ActionPanel>
            <Action
              title="Add More Clues"
              icon={Icon.Message}
              onAction={() => {
                setState((prev) => ({ ...prev, phase: "idle" }));
                setSearchText(`${state.query}；`);
              }}
            />
            <Action
              title="Try Again"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                sessionRef.current = null;
                setState({
                  phase: "idle",
                  query: "",
                  steps: [],
                  summary: "",
                  results: [],
                  clarifyingQuestions: [],
                  error: null,
                });
                setSearchText("");
              }}
            />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Main list view
  return (
    <List
      searchBarPlaceholder="Describe what you remember about the file..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      isShowingDetail={state.phase === "results" && state.results.length > 0}
      actions={
        <ActionPanel>
          <Action
            title="Search"
            icon={Icon.MagnifyingGlass}
            onAction={() => handleSearch(searchText)}
          />
        </ActionPanel>
      }
    >
      {/* Idle / Input State — no text yet */}
      {state.phase === "idle" && !searchText && (
        <List.EmptyView
          icon={Icon.Stars}
          title="Recall a File by Memory"
          description={
            "Describe what you remember — purpose, context, or any vague detail.\n\nExamples:\n• 'A spreadsheet I used for reconciliation'\n• 'That PDF from the client meeting last month'\n• 'Screenshots I saved last week'\n• 'Python script for data migration'\n\nPress Enter to search."
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Idle / Input State — has text, waiting for Enter */}
      {state.phase === "idle" && searchText && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Press Enter to Search"
          description={`"${searchText}"\n\nPress Enter to let AI analyze your memory and find matching files.`}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => handleSearch(searchText)}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Thinking State — agent is working */}
      {state.phase === "thinking" && (
        <List.EmptyView
          icon={Icon.Stars}
          title="Agent is thinking..."
          description={
            (state.steps.length > 0
              ? state.steps[state.steps.length - 1].content
              : "Analyzing your description...") +
            "\n\nPress Esc or Enter to stop the search."
          }
          actions={
            <ActionPanel>
              <Action
                title="Stop Search"
                icon={Icon.Stop}
                onAction={handleStopSearch}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Results State — empty */}
      {state.phase === "results" && state.results.length === 0 && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No files matched"
          description="Try describing the file differently or add more details."
        />
      )}

      {/* Re-search button: appears when user has modified the search bar */}
      {state.phase === "results" &&
        searchText !== state.query &&
        searchText.trim().length >= 2 && (
          <List.Section title="Ready to Re-search">
            <List.Item
              icon={{ source: Icon.ArrowRight, tintColor: Color.Green }}
              title="Press Enter to Search with New Clues"
              subtitle={searchText}
              detail={
                <List.Item.Detail
                  markdown={`## Search with Updated Query\n\n**New query:**\n\`${searchText}\`\n\n**Original query:**\n\`${state.query}\`\n\n---\n\nPress **Enter** to re-search with the updated clues.`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Search Now"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleSearch(searchText)}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        )}

      {/* Agent Thinking Steps (collapsible) */}
      {state.phase === "results" && state.steps.length > 0 && (
        <List.Section
          title={
            showThinking
              ? "Agent Thinking (click to collapse)"
              : "Agent Thinking (click to expand)"
          }
          subtitle={`${state.steps.length} steps`}
        >
          {showThinking ? (
            <>
              {/* Collapse toggle */}
              <List.Item
                icon={{
                  source: Icon.ChevronUp,
                  tintColor: Color.SecondaryText,
                }}
                title="Collapse Thinking"
                actions={
                  <ActionPanel>
                    <Action
                      title="Toggle Thinking"
                      icon={Icon.Eye}
                      onAction={() => setShowThinking(false)}
                    />
                  </ActionPanel>
                }
              />
              {/* Individual steps */}
              {state.steps.map((step, i) => (
                <List.Item
                  key={`step-${i}`}
                  icon={getStepIcon(step)}
                  title={
                    step.content.split("\n")[0].length > 80
                      ? step.content.split("\n")[0].slice(0, 80) + "..."
                      : step.content.split("\n")[0]
                  }
                  subtitle={step.toolName}
                  detail={
                    <List.Item.Detail
                      markdown={`### Step ${i + 1}: ${step.type}\n\n${step.content}${step.toolArgs ? `\n\n**Args:**\n\`\`\`json\n${JSON.stringify(step.toolArgs, null, 2)}\n\`\`\`` : ""}`}
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Toggle Thinking"
                        icon={Icon.Eye}
                        onAction={() => setShowThinking(false)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </>
          ) : (
            /* Collapsed: single item showing summary */
            <List.Item
              icon={{
                source: Icon.ChevronDown,
                tintColor: Color.SecondaryText,
              }}
              title={state.summary || `${state.steps.length} reasoning steps`}
              subtitle="Press Enter to expand"
              detail={
                <List.Item.Detail
                  markdown={`## Agent Summary\n\n${state.summary}\n\n---\n\n**${state.steps.length} steps** — Press Enter to see details.\n\n${renderThinkingMarkdown()}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Thinking"
                    icon={Icon.Eye}
                    onAction={() => setShowThinking(true)}
                  />
                  <Action
                    title="Add More Clues"
                    icon={Icon.Message}
                    onAction={() => handleAnswerQuestion()}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}

      {/* Clarifying Questions */}
      {state.phase === "results" && state.clarifyingQuestions.length > 0 && (
        <List.Section title="Narrow Down Results">
          {state.clarifyingQuestions.map((question, i) => (
            <List.Item
              key={`cq-${i}`}
              icon={{
                source: Icon.QuestionMarkCircle,
                tintColor: Color.Yellow,
              }}
              title={question}
              detail={
                <List.Item.Detail
                  markdown={`### ${question}\n\n**How to answer:**\n1. Press **Enter** to start typing your answer in the search bar\n2. Type your answer after the semicolon\n3. You can click more questions to add more clues\n4. Select the green **"Press Enter to Search"** item at the top and press Enter\n\n---\n\n**Current query:** ${state.query}\n\n**Agent summary:** ${state.summary}`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Answer This Question"
                    icon={Icon.Pencil}
                    onAction={() => handleAnswerQuestion()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Results Section */}
      {state.phase === "results" && state.results.length > 0 && (
        <List.Section
          title="Possible Matches"
          subtitle={`${state.results.length} files`}
        >
          {state.results.map((file) => (
            <List.Item
              key={file.path}
              icon={getFileIcon(file)}
              title={file.name}
              subtitle={shortenPath(file.path)}
              accessories={[
                ...(isMediaFile(file.extension)
                  ? [
                      {
                        tag: {
                          value: file.extension.toUpperCase(),
                          color: Color.Purple,
                        },
                      },
                    ]
                  : []),
                {
                  tag: {
                    value: `${file.relevanceScore}%`,
                    color:
                      file.relevanceScore >= 70
                        ? Color.Green
                        : file.relevanceScore >= 40
                          ? Color.Yellow
                          : Color.Orange,
                  },
                },
                {
                  date: file.modifiedAt,
                  tooltip: `Modified: ${formatDate(file.modifiedAt)}`,
                },
              ]}
              detail={
                <List.Item.Detail markdown={buildFileDetailMarkdown(file)} />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Open">
                    <Action.Open title="Open File" target={file.path} />
                    <Action.ShowInFinder path={file.path} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Feedback">
                    <Action
                      title="Add More Clues"
                      icon={Icon.Message}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => handleAnswerQuestion()}
                    />
                    <Action
                      title="Similar to This"
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => handleSimilar(file)}
                    />
                    <Action
                      title="Not This One"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => handleNotThis(file)}
                    />
                    <Action
                      title={`Only .${file.extension} Files`}
                      icon={Icon.Filter}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => handleOnlyThisType(file)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={file.path}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy File Name"
                      content={file.name}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="New Search"
                      icon={Icon.MagnifyingGlass}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => {
                        sessionRef.current = null;
                        setState({
                          phase: "idle",
                          query: "",
                          steps: [],
                          summary: "",
                          results: [],
                          clarifyingQuestions: [],
                          error: null,
                        });
                        setSearchText("");
                      }}
                    />
                    <Action
                      title="Open Extension Preferences"
                      icon={Icon.Gear}
                      shortcut={Keyboard.Shortcut.Common.Pin}
                      onAction={openExtensionPreferences}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
