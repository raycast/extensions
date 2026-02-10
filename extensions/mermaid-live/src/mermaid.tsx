import {
  Detail,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  LocalStorage,
  Form,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import pako from "pako";

interface State {
  markdown?: string;
  isLoading: boolean;
  error?: Error;
  mermaidCode?: string;
  lastUpdated?: Date;
}

interface HistoryItem {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  isPinned: boolean;
}

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: true });
  const [lastClipboard, setLastClipboard] = useState<string | undefined>(undefined);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [currentHistoryItem, setCurrentHistoryItem] = useState<HistoryItem | null>(null);

  // Load the last saved diagram on startup
  useEffect(() => {
    async function loadSavedDiagram() {
      try {
        // Migrate existing data if necessary
        await migrateHistoryData();

        const savedCode = await LocalStorage.getItem<string>("lastMermaidCode");
        const savedTimestamp = await LocalStorage.getItem<string>("lastUpdatedTimestamp");

        if (savedCode) {
          const encoded = encodeMermaid(savedCode);
          const imageUrl = `https://mermaid.ink/img/pako:${encoded}`;
          const markdown = `# Mermaid Diagram\n\n![Diagram](${imageUrl}?raycast-width=900)`;

          // Check if it exists in history
          const historyItem = await findHistoryItemByCode(savedCode);
          setCurrentHistoryItem(historyItem);

          setState({
            markdown,
            isLoading: false,
            mermaidCode: savedCode,
            lastUpdated: savedTimestamp ? new Date(savedTimestamp) : undefined,
          });
          setIsFirstRender(false);
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    loadSavedDiagram();
  }, []);

  useEffect(() => {
    let isMounted = true; // Flag to prevent setState on unmounted component

    async function loadAndRender() {
      try {
        // 1. Read from clipboard
        const clipboardText = await Clipboard.readText();

        // If clipboard hasn't changed, do nothing
        if (clipboardText === lastClipboard) {
          return;
        }

        if (!isMounted) return; // Don't update if unmounted

        // Update last known clipboard
        setLastClipboard(clipboardText);

        if (!clipboardText) {
          // Empty clipboard - show informative state
          if (!isMounted) return;
          setState({
            isLoading: false,
            markdown: undefined,
            error: new Error("EMPTY_CLIPBOARD"),
          });
          return;
        }

        // 2. Validate that it's Mermaid code (basic)
        if (!isMermaidCode(clipboardText)) {
          // Not Mermaid - keep last valid diagram or show informative state
          if (!isMounted) return;
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: prev.mermaidCode ? undefined : new Error("INVALID_MERMAID"),
          }));
          return;
        }

        // Show loading while rendering
        if (!isMounted) return;
        setState({
          isLoading: true,
          markdown: undefined,
          error: undefined,
          mermaidCode: undefined,
        });

        // 3. Encode using pako format
        const encoded = encodeMermaid(clipboardText);

        // 4. Generate URL
        const imageUrl = `https://mermaid.ink/img/pako:${encoded}`;

        // 5. Create markdown for Detail (no timestamp, only in metadata)
        // Use raycast-width to make the image larger in the panel
        const markdown = `# Mermaid Diagram\n\n![Diagram](${imageUrl}?raycast-width=900)`;

        const now = new Date();
        if (!isMounted) return;
        setState({
          markdown,
          isLoading: false,
          mermaidCode: clipboardText,
          lastUpdated: now,
        });

        // Save to LocalStorage for persistence
        await LocalStorage.setItem("lastMermaidCode", clipboardText);
        await LocalStorage.setItem("lastUpdatedTimestamp", now.toISOString());

        // Save to history (avoiding duplicates) and get the item
        const historyItem = await saveToHistory(clipboardText);
        if (!isMounted) return;
        setCurrentHistoryItem(historyItem);

        // Mark that this is no longer the first render
        if (isFirstRender) {
          setIsFirstRender(false);
        }
      } catch (error) {
        if (!isMounted) return;
        setState({
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    // Load immediately
    loadAndRender();

    // Poll every 1 second to detect clipboard changes
    const interval = setInterval(loadAndRender, 1000);

    // Cleanup on unmount
    return () => {
      isMounted = false; // Mark as unmounted
      clearInterval(interval);
    };
  }, [lastClipboard, isFirstRender]); // Add correct dependencies

  // Toast removed - visual feedback will be on screen

  // Show error toast only for real errors (not for empty or invalid clipboard)
  useEffect(() => {
    if (state.error && state.error.message !== "EMPTY_CLIPBOARD" && state.error.message !== "INVALID_MERMAID") {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to render diagram",
        message: state.error.message,
      });
    }
  }, [state.error]);

  // State: Empty clipboard
  if (state.error?.message === "EMPTY_CLIPBOARD") {
    const emptyMarkdown = `# 📋 Watching Clipboard...

![Empty Clipboard](https://em-content.zobj.net/source/apple/391/clipboard_1f4cb.png)

## Ready to render!

I'm automatically monitoring your clipboard. Just copy some Mermaid code and I'll render it instantly! ⚡

No need to close and reopen — the diagram will appear automatically.

### Example to try:
\`\`\`
graph TD
    A[Start] --> B[Process]
    B --> C[End]
\`\`\`

💡 **Tip:** Copy the example above and watch the magic happen!

Need help? Check out [Mermaid Documentation](https://mermaid.js.org/)`;

    return <Detail markdown={emptyMarkdown} navigationTitle="Mermaid Diagram - Watching" />;
  }

  // State: Content is not Mermaid
  if (state.error?.message === "INVALID_MERMAID") {
    const invalidMarkdown = `# 🤔 Hmm, that doesn't look like Mermaid...

![Confused](https://em-content.zobj.net/source/apple/391/thinking-face_1f914.png)

## I couldn't recognize Mermaid code in your clipboard

Your clipboard contains text, but it doesn't match any known Mermaid diagram types.

🔄 **Still watching!** Copy valid Mermaid code and I'll render it automatically.

### Supported Diagram Types:
- 📊 \`graph\` / \`flowchart\` - Flowcharts
- 🔄 \`sequenceDiagram\` - Sequence diagrams
- 📦 \`classDiagram\` - Class diagrams
- 🎯 \`stateDiagram\` - State diagrams
- 🗂️ \`erDiagram\` - Entity relationship diagrams
- 📅 \`gantt\` - Gantt charts
- 🥧 \`pie\` - Pie charts
- 🗺️ \`journey\` - User journeys
- 🌳 \`gitGraph\` - Git graphs
- 🧠 \`mindmap\` - Mind maps
- ⏱️ \`timeline\` - Timelines
- 📈 \`quadrantChart\` - Quadrant charts

### Quick Example:
\`\`\`
graph TD
    A[Copy me!] --> B[Run the command]
    B --> C[See the magic! ✨]
\`\`\`

Try copying some Mermaid code and run this command again!

[Learn More](https://mermaid.js.org/) • [Try in Live Editor](https://mermaid.live/)`;

    return (
      <Detail
        markdown={invalidMarkdown}
        navigationTitle="Mermaid Diagram"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Mermaid Live Editor" url="https://mermaid.live/" />
            <Action.OpenInBrowser title="View Documentation" url="https://mermaid.js.org/" />
          </ActionPanel>
        }
      />
    );
  }

  // Real error (network issues, encoding, etc.)
  if (state.error) {
    return (
      <Detail
        markdown={`# ⚠️ Error\n\n${state.error.message}\n\nPlease try again or check your internet connection.`}
        navigationTitle="Mermaid Diagram"
      />
    );
  }

  // Loading state - while rendering or on first load
  if (state.isLoading) {
    return (
      <Detail
        markdown="# ⏳ Rendering your diagram...\n\nThis will only take a moment!"
        isLoading={true}
        navigationTitle="Mermaid Diagram - Rendering"
      />
    );
  }

  return (
    <Detail
      markdown={state.markdown || "Loading..."}
      isLoading={state.isLoading}
      navigationTitle="Mermaid Diagram"
      actions={
        !state.isLoading && state.mermaidCode ? (
          <ActionPanel>
            {currentHistoryItem && (
              <Action.Push
                title="Rename Diagram"
                icon={Icon.Pencil}
                target={
                  <RenameCurrentForm
                    currentName={currentHistoryItem.name}
                    code={state.mermaidCode}
                    onRename={async (newName) => {
                      const updatedItem = { ...currentHistoryItem, name: newName };
                      setCurrentHistoryItem(updatedItem);
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
            {!currentHistoryItem && (
              <Action
                title="Save to History"
                icon={Icon.SaveDocument}
                onAction={async () => {
                  const item = await saveToHistory(state.mermaidCode!);
                  setCurrentHistoryItem(item);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Saved to history",
                  });
                }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            )}
            <Action.Open
              title="Open History"
              icon={Icon.Clock}
              target="raycast://extensions/reynaldo_endis/mermaid-live/history"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
            <Action.OpenInBrowser
              title="Expand Diagram"
              icon="↕️"
              url={`https://mermaid.ink/img/pako:${encodeMermaid(state.mermaidCode)}`}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.OpenInBrowser
              title="Edit in Mermaid Live"
              url={`https://mermaid.live/edit#pako:${encodeMermaid(state.mermaidCode)}`}
            />
            <Action.CopyToClipboard
              title="Copy Mermaid Code"
              content={state.mermaidCode}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Image URL"
              content={`https://mermaid.ink/img/pako:${encodeMermaid(state.mermaidCode)}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : undefined
      }
      metadata={
        !state.isLoading && state.mermaidCode ? (
          <Detail.Metadata>
            {currentHistoryItem ? (
              <>
                <Detail.Metadata.Label title="Name" icon={Icon.SaveDocument} text={currentHistoryItem.name} />
                <Detail.Metadata.Label title="Status" icon={Icon.CheckCircle} text="Saved in History" />
              </>
            ) : (
              <Detail.Metadata.Label title="Status" icon={Icon.XMarkCircle} text="Not Saved" />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Format" text="Mermaid" />
            <Detail.Metadata.Label title="Lines" text={state.mermaidCode.split("\n").length.toString()} />
            <Detail.Metadata.Label title="Characters" text={state.mermaidCode.length.toString()} />
            {state.lastUpdated && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label
                  title="Rendered"
                  text={state.lastUpdated.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Documentation" target="https://mermaid.js.org/" text="Mermaid Docs" />
            <Detail.Metadata.Link
              title="Live Editor"
              target={`https://mermaid.live/edit#pako:${encodeMermaid(state.mermaidCode)}`}
              text="Edit Online"
            />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

// Utility Functions

function isMermaidCode(text: string): boolean {
  const trimmed = text.trim();
  const mermaidKeywords = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "erDiagram",
    "gantt",
    "pie",
    "journey",
    "gitGraph",
    "mindmap",
    "timeline",
    "quadrantChart",
  ];

  return mermaidKeywords.some(
    (keyword) => trimmed.startsWith(keyword) || trimmed.includes(`\n${keyword}`) || trimmed.includes(` ${keyword}`),
  );
}

function encodeMermaid(mermaidCode: string): string {
  // Create object with mermaid.ink format
  const graphObject = {
    code: mermaidCode,
    mermaid: JSON.stringify({ theme: "default" }),
  };

  // Convert to JSON and compress with pako (deflate)
  const jsonString = JSON.stringify(graphObject);
  const compressed = pako.deflate(jsonString);

  // Convert to URL-safe base64
  const base64 = Buffer.from(compressed).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// History management functions
async function saveToHistory(code: string): Promise<HistoryItem> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  const history: HistoryItem[] = historyJson ? JSON.parse(historyJson) : [];

  const now = new Date().toISOString();

  // Check if already exists (avoid duplicates by code)
  const existingIndex = history.findIndex((item) => item.code === code);
  let currentItem: HistoryItem;

  if (existingIndex !== -1) {
    // Update last accessed time of existing item
    history[existingIndex].lastAccessed = now;
    currentItem = history[existingIndex];
  } else {
    // Create new item with auto-generated name
    const diagramType = detectDiagramType(code);
    currentItem = {
      id: generateId(),
      code,
      name: `${diagramType} - ${new Date().toLocaleDateString()}`,
      createdAt: now,
      lastAccessed: now,
      isPinned: false,
    };
    history.unshift(currentItem); // Add at beginning
  }

  // Limit history to 100 items
  const limitedHistory = history.slice(0, 100);
  await LocalStorage.setItem("mermaid-history", JSON.stringify(limitedHistory));

  return currentItem;
}

async function findHistoryItemByCode(code: string): Promise<HistoryItem | null> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return null;
  const history: HistoryItem[] = JSON.parse(historyJson);
  return history.find((item) => item.code === code) || null;
}

async function renameCurrentDiagram(code: string, newName: string): Promise<void> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return;
  const history: HistoryItem[] = JSON.parse(historyJson);
  const item = history.find((item) => item.code === code);
  if (item) {
    item.name = newName;
    await LocalStorage.setItem("mermaid-history", JSON.stringify(history));
  }
}

function detectDiagramType(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith("graph") || trimmed.startsWith("flowchart")) return "Flowchart";
  if (trimmed.includes("sequenceDiagram")) return "Sequence";
  if (trimmed.includes("classDiagram")) return "Class";
  if (trimmed.includes("stateDiagram")) return "State";
  if (trimmed.includes("erDiagram")) return "ER";
  if (trimmed.includes("gantt")) return "Gantt";
  if (trimmed.includes("pie")) return "Pie";
  if (trimmed.includes("journey")) return "Journey";
  if (trimmed.includes("gitGraph")) return "Git";
  if (trimmed.includes("mindmap")) return "Mindmap";
  if (trimmed.includes("timeline")) return "Timeline";
  if (trimmed.includes("quadrantChart")) return "Quadrant";
  return "Diagram";
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Migrate existing data to add lastAccessed
async function migrateHistoryData(): Promise<void> {
  const historyJson = await LocalStorage.getItem<string>("mermaid-history");
  if (!historyJson) return;

  const history: HistoryItem[] = JSON.parse(historyJson);
  let needsMigration = false;

  const migratedHistory = history.map((item) => {
    if (!item.lastAccessed) {
      needsMigration = true;
      return {
        ...item,
        lastAccessed: item.createdAt || new Date().toISOString(),
      };
    }
    return item;
  });

  if (needsMigration) {
    await LocalStorage.setItem("mermaid-history", JSON.stringify(migratedHistory));
  }
}

// Form to rename from render view
function RenameCurrentForm({
  currentName,
  code,
  onRename,
}: {
  currentName: string;
  code: string;
  onRename: (newName: string) => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    if (values.name.trim()) {
      await renameCurrentDiagram(code, values.name.trim());
      showToast({
        style: Toast.Style.Success,
        title: "Renamed successfully",
      });
      onRename(values.name.trim());
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Rename Diagram"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Enter new name" defaultValue={currentName} />
    </Form>
  );
}
