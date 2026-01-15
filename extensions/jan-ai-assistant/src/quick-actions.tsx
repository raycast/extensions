import {
  ActionPanel,
  Action,
  List,
  Clipboard,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { sendToJanAi } from "./utils/janApi";

interface QuickAction {
  id: string;
  title: string;
  icon: Icon;
  prompt: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "summarize",
    title: "Summarize",
    icon: Icon.Text,
    prompt: "Summarize this text concisely:",
    description: "Create a brief summary",
  },
  {
    id: "improve",
    title: "Improve Writing",
    icon: Icon.Pencil,
    prompt: "Improve the writing of this text while maintaining its meaning:",
    description: "Enhance clarity and flow",
  },
  {
    id: "grammar",
    title: "Fix Grammar",
    icon: Icon.CheckCircle,
    prompt: "Fix any grammar and spelling errors in this text:",
    description: "Correct errors and typos",
  },
  {
    id: "professional",
    title: "Make Professional",
    icon: Icon.Envelope,
    prompt: "Rewrite this text in a professional tone:",
    description: "Convert to business language",
  },
  {
    id: "casual",
    title: "Make Casual",
    icon: Icon.SpeechBubble,
    prompt: "Rewrite this text in a casual, friendly tone:",
    description: "Simplify and lighten the tone",
  },
  {
    id: "expand",
    title: "Expand",
    icon: Icon.PlusCircle,
    prompt: "Expand on this text with more details and examples:",
    description: "Add more information",
  },
  {
    id: "shorten",
    title: "Shorten",
    icon: Icon.MinusCircle,
    prompt: "Make this text more concise while keeping key points:",
    description: "Reduce length",
  },
  {
    id: "explain",
    title: "Explain",
    icon: Icon.QuestionMark,
    prompt: "Explain this text in simple terms:",
    description: "Simplify complex concepts",
  },
  {
    id: "translate-spanish",
    title: "Translate to Spanish",
    icon: Icon.Globe,
    prompt: "Translate this text to Spanish:",
    description: "Convert to Spanish",
  },
  {
    id: "bullet-points",
    title: "Convert to Bullet Points",
    icon: Icon.List,
    prompt: "Convert this text into clear bullet points:",
    description: "Create a bulleted list",
  },
  {
    id: "reminders-to-csv",
    title: "Reminders to CSV Table",
    icon: Icon.Document,
    prompt: `Parse these reminders into a CSV table with three columns: Date (YYYY-MM-DD format), Subject, Amount.

Rules:
1. Extract dates in YYYY-MM-DD format
2. If no amount specified, use 0
3. Bills/expenses are negative numbers (add minus sign)
4. Income/payments received are positive numbers
5. Split into TWO tables: EXPENSES and INCOME
6. Include CSV headers

Example Input:
- Electric bill $150 due Jan 15
- Client payment $5000 on Jan 10
- Rent $2000 due Jan 20

Expected Output:

EXPENSES:
Date,Subject,Amount
2025-01-15,Electric bill,-150.00
2025-01-20,Rent,-2000.00

INCOME:
Date,Subject,Amount
2025-01-10,Client payment,5000.00

Now parse these reminders:`,
    description: "Convert to expense/income CSV table",
  },
];

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadClipboard() {
      const text = await Clipboard.readText();
      setClipboardText(text || "No text in clipboard");
    }
    loadClipboard();
  }, []);

  async function executeAction(action: QuickAction) {
    const text = await Clipboard.readText();

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text in clipboard",
        message: "Copy some text first",
      });
      return;
    }

    setIsLoading(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `${action.title}...`,
      });

      const response = await sendToJanAi([
        { role: "user", content: `${action.prompt}\n\n${text}` },
      ]);

      await Clipboard.copy(response);

      await showToast({
        style: Toast.Style.Success,
        title: "Complete",
        message: "Result copied to clipboard",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Action failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search actions...">
      <List.Section
        title="Clipboard Text"
        subtitle={clipboardText.substring(0, 50) + "..."}
      >
        {QUICK_ACTIONS.map((action) => (
          <List.Item
            key={action.id}
            title={action.title}
            subtitle={action.description}
            icon={action.icon}
            actions={
              <ActionPanel>
                <Action
                  title={`${action.title}`}
                  onAction={() => executeAction(action)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
