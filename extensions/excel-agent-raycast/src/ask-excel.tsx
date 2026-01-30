import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Detail,
  getPreferenceValues,
  List,
  Icon,
  LocalStorage,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import {
  generateScript,
  executeScript,
  checkExcel,
  getExcelContext,
  Preferences,
} from "./ai-utils";

const PROVIDER_NAMES: Record<string, string> = {
  raycast: "Raycast AI",
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
};

const QUICK_ACTIONS = [
  {
    title: "🔌 Test Connection",
    icon: Icon.Plug,
    instruction: "Test connection to Excel",
  },
  {
    title: "Financial Style",
    icon: Icon.Coins,
    instruction: "Apply financial style with blue inputs and black formulas",
  },
  {
    title: "Bold Headers",
    icon: Icon.Text,
    instruction: "Bold row 1",
  },
  {
    title: "Format Currency",
    icon: Icon.BankNote,
    instruction: "Format selection as currency",
  },
  {
    title: "Format Percent",
    icon: Icon.Gauge,
    instruction: "Format selection as percent",
  },
  {
    title: "Add Borders",
    icon: Icon.SquareEllipsis,
    instruction: "Add borders to used range",
  },
  {
    title: "Auto-fit Columns",
    icon: Icon.ArrowsExpand,
    instruction: "Autofit columns",
  },
  {
    title: "Read Selection",
    icon: Icon.Eye,
    instruction: "Read selection values",
  },
  {
    title: "Freeze Top Row",
    icon: Icon.Pin,
    instruction: "Freeze top row",
  },
];

interface HistoryItem {
  instruction: string;
  timestamp: number;
}

async function saveHistory(instruction: string) {
  try {
    const json = await LocalStorage.getItem<string>("history");
    const history: HistoryItem[] = json ? JSON.parse(json) : [];
    const filtered = history.filter((h) => h.instruction !== instruction);
    const updated = [{ instruction, timestamp: Date.now() }, ...filtered].slice(
      0,
      10,
    );
    await LocalStorage.setItem("history", JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

async function getHistory(): Promise<HistoryItem[]> {
  try {
    const json = await LocalStorage.getItem<string>("history");
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

function ResultView({
  success,
  result,
  script,
  elapsed,
  error,
}: {
  success: boolean;
  result: string;
  script: string;
  elapsed: string;
  error?: string;
}) {
  return (
    <Detail
      markdown={
        success
          ? `## ✅ Done (${elapsed}s)

${result && result !== "Done" ? `**Result:** \`${result}\`\n\n` : ""}
### Script Executed
\`\`\`applescript
${script}
\`\`\``
          : `## ❌ Error

\`\`\`
${error || "Unknown error"}
\`\`\`

### Script Attempted
\`\`\`applescript
${script}
\`\`\`

### Troubleshooting
- Make sure Excel is open with a workbook
- Check that cells/ranges exist
- Try a simpler command first`
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={script} title="Copy Script" />
          {error && (
            <Action.CopyToClipboard content={error} title="Copy Error" />
          )}
        </ActionPanel>
      }
    />
  );
}

function QuickActionsView({ onRun }: { onRun: (instruction: string) => void }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  return (
    <List searchBarPlaceholder="Search actions...">
      <List.Section title="Quick Actions">
        {QUICK_ACTIONS.map((a) => (
          <List.Item
            key={a.title}
            title={a.title}
            icon={a.icon}
            actions={
              <ActionPanel>
                <Action title="Run" onAction={() => onRun(a.instruction)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {history.length > 0 && (
        <List.Section title="Recent">
          {history.map((h, i) => (
            <List.Item
              key={i}
              title={
                h.instruction.slice(0, 50) +
                (h.instruction.length > 50 ? "..." : "")
              }
              icon={Icon.Clock}
              actions={
                <ActionPanel>
                  <Action
                    title="Run Again"
                    onAction={() => onRun(h.instruction)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Custom">
        <List.Item
          title="Custom Command..."
          icon={Icon.Pencil}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open"
                target={<CustomForm onSubmit={onRun} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function CustomForm({ onSubmit }: { onSubmit: (instruction: string) => void }) {
  const prefs = getPreferenceValues<Preferences>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run"
            onSubmit={(v: { instruction: string }) => {
              if (v.instruction.trim()) onSubmit(v.instruction);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="instruction"
        title="What to do"
        placeholder="e.g., Make row 1 bold and add borders"
      />
      <Form.Description text={`Using: ${PROVIDER_NAMES[prefs.aiProvider]}`} />
    </Form>
  );
}

export default function Command() {
  const [loading, setLoading] = useState(false);
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();

  async function runCommand(instruction: string) {
    setLoading(true);
    const start = Date.now();
    let script = "";

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking Excel...",
    });

    try {
      // Check Excel and get context in one go to save time
      toast.title = "Reading Excel...";
      const context = await getExcelContext();

      if (
        context.includes("No workbook") ||
        context.includes("Excel busy") ||
        context.includes("Context unavailable")
      ) {
        // Double check if it's just not running
        const ok = await checkExcel();
        if (!ok) {
          toast.style = Toast.Style.Failure;
          toast.title = "Excel not running";
          toast.message = "Open Excel first";
          setLoading(false);
          return;
        }
      }

      // Generate script
      toast.title = `Generating (${PROVIDER_NAMES[prefs.aiProvider]})...`;
      script = await generateScript(instruction);

      // Execute
      toast.title = "Running...";
      const result = await executeScript(script);

      // Save to history
      await saveHistory(instruction);

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      toast.style = Toast.Style.Success;
      toast.title = `Done in ${elapsed}s`;

      push(
        <ResultView
          success={true}
          result={result}
          script={script}
          elapsed={elapsed}
        />,
      );
    } catch (e) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const msg = e instanceof Error ? e.message : String(e);

      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = msg.slice(0, 50);

      push(
        <ResultView
          success={false}
          result=""
          script={script || "(no script generated)"}
          elapsed={elapsed}
          error={msg}
        />,
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <List isLoading={true} />;
  }

  return <QuickActionsView onRun={runCommand} />;
}
