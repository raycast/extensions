import {
  Action,
  ActionPanel,
  Detail,
  List,
  getSelectedText,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { sendMessage } from "./api";

interface ActionItem {
  id: string;
  title: string;
  prompt: string;
  icon: Icon;
}

const ACTIONS: ActionItem[] = [
  {
    id: "explain",
    title: "Explain",
    prompt: "Explain this in simple terms:",
    icon: Icon.QuestionMark,
  },
  {
    id: "summarize",
    title: "Summarize",
    prompt: "Summarize this concisely:",
    icon: Icon.Document,
  },
  {
    id: "fix-grammar",
    title: "Fix Grammar",
    prompt: "Fix the grammar and spelling, return only the corrected text:",
    icon: Icon.Pencil,
  },
  {
    id: "improve",
    title: "Improve Writing",
    prompt: "Improve this writing while keeping the same meaning:",
    icon: Icon.Stars,
  },
  {
    id: "simplify",
    title: "Simplify",
    prompt: "Simplify this text to make it easier to understand:",
    icon: Icon.MinusCircle,
  },
  {
    id: "expand",
    title: "Expand",
    prompt: "Expand on this with more detail:",
    icon: Icon.PlusCircle,
  },
  {
    id: "translate",
    title: "Translate to English",
    prompt: "Translate this to English:",
    icon: Icon.Globe,
  },
  {
    id: "code-explain",
    title: "Explain Code",
    prompt: "Explain what this code does:",
    icon: Icon.Code,
  },
  {
    id: "code-review",
    title: "Review Code",
    prompt: "Review this code and suggest improvements:",
    icon: Icon.Eye,
  },
  {
    id: "bullet-points",
    title: "Make Bullet Points",
    prompt: "Convert this into clear bullet points:",
    icon: Icon.List,
  },
];

function ResultView({
  action,
  selectedText,
  answer,
}: {
  action: ActionItem;
  selectedText: string;
  answer: string;
}) {
  const markdown = `## ${action.title}

### Original
\`\`\`
${selectedText.slice(0, 500)}${selectedText.length > 500 ? "..." : ""}
\`\`\`

---

### Result
${answer}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Result" content={answer} />
          <Action.CopyToClipboard
            title="Copy Result"
            content={answer}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy All"
            content={`Original:\n${selectedText}\n\nResult:\n${answer}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [result, setResult] = useState<{
    action: ActionItem;
    answer: string;
  } | null>(null);

  useEffect(() => {
    async function getText() {
      try {
        const text = await getSelectedText();
        setSelectedText(text || "");
      } catch {
        // getSelectedText throws if nothing selected
        setSelectedText("");
      } finally {
        setIsLoading(false);
      }
    }
    getText();
  }, []);

  async function handleAction(action: ActionItem) {
    if (!selectedText.trim()) {
      showToast({ style: Toast.Style.Failure, title: "No text selected" });
      return;
    }

    setProcessingAction(action.id);

    try {
      const fullMessage = `${action.prompt}\n\n${selectedText}`;
      const response = await sendMessage([
        { role: "user", content: fullMessage },
      ]);
      setResult({ action, answer: response });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to get response",
      });
    } finally {
      setProcessingAction(null);
    }
  }

  if (result) {
    return (
      <ResultView
        action={result.action}
        selectedText={selectedText}
        answer={result.answer}
      />
    );
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!selectedText.trim()) {
    return (
      <Detail
        markdown={`## No Text Selected

Select some text in any application, then run this command again.

**Tip:** You can assign a keyboard shortcut to this command in Raycast preferences for quick access.`}
      />
    );
  }

  return (
    <List>
      <List.Section
        title={`Selected: "${selectedText.slice(0, 50)}${selectedText.length > 50 ? "..." : ""}"`}
      >
        {ACTIONS.map((action) => (
          <List.Item
            key={action.id}
            icon={action.icon}
            title={action.title}
            accessories={
              processingAction === action.id ? [{ text: "Processing..." }] : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={action.title}
                  icon={action.icon}
                  onAction={() => handleAction(action)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
