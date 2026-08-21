import {
  Action,
  ActionPanel,
  Detail,
  getSelectedText,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { askQuestion } from "./api";
import { ConversationView } from "./conversation";

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
}: {
  action: ActionItem;
  selectedText: string;
}) {
  const [answer, setAnswer] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const buffer = useRef("");
  const lastUpdate = useRef(0);

  useEffect(() => {
    askQuestion(`${action.prompt}\n\n${selectedText}`, (chunk) => {
      buffer.current += chunk;
      const now = Date.now();
      if (now - lastUpdate.current > 100) {
        lastUpdate.current = now;
        setAnswer(buffer.current);
      }
    })
      .then((result) => {
        setAnswer(result.content);
        setSessionId(result.sessionId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsLoading(false));
  }, [action, selectedText]);

  const markdown = error
    ? `## Error\n\n${error}`
    : `## ${action.title}

### Original
\`\`\`
${selectedText.slice(0, 500)}${selectedText.length > 500 ? "…" : ""}
\`\`\`

---

### Result
${answer || "*Working…*"}`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Result" content={answer} />
          <Action.CopyToClipboard
            title="Copy Result"
            content={answer}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {sessionId && (
            <Action.Push
              title="Continue in Chat"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "j" }}
              target={
                <ConversationView
                  sessionId={sessionId}
                  sessionTitle={action.title}
                />
              }
            />
          )}
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
  const { push } = useNavigation();

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
        title={`Selected: "${selectedText.slice(0, 50)}${selectedText.length > 50 ? "…" : ""}"`}
      >
        {ACTIONS.map((action) => (
          <List.Item
            key={action.id}
            icon={action.icon}
            title={action.title}
            actions={
              <ActionPanel>
                <Action
                  title={action.title}
                  icon={action.icon}
                  onAction={() =>
                    push(
                      <ResultView
                        action={action}
                        selectedText={selectedText}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
