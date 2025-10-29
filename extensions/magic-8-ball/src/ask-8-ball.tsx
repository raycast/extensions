import { List, ActionPanel, Action, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";

// Classic Magic 8-Ball responses categorized by type
const POSITIVE_RESPONSES = [
  "It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
];

const NON_COMMITTAL_RESPONSES = [
  "Reply hazy, try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
];

const NEGATIVE_RESPONSES = [
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful",
];

// Combine all responses
const ALL_RESPONSES = [...POSITIVE_RESPONSES, ...NON_COMMITTAL_RESPONSES, ...NEGATIVE_RESPONSES];

function getRandomResponse(): string {
  const randomIndex = Math.floor(Math.random() * ALL_RESPONSES.length);
  return ALL_RESPONSES[randomIndex];
}

// Store history of questions and answers
interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
}

let history: HistoryItem[] = [];

function AnswerView({ question, onAskAnother }: { question: string; onAskAnother: () => void }) {
  const [response, setResponse] = useState<string>("");
  const [isShaking, setIsShaking] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const getNewAnswer = (newQuestion?: string) => {
    const questionToUse = newQuestion || question;
    setIsShaking(true);
    setTimeout(() => {
      const answer = getRandomResponse();
      setResponse(answer);
      setIsShaking(false);

      // Add to history
      history.unshift({
        id: Date.now().toString(),
        question: questionToUse,
        answer,
        timestamp: new Date(),
      });
      // Keep only last 20 items
      if (history.length > 20) {
        history = history.slice(0, 20);
      }
    }, 800);
  };

  useState(() => {
    getNewAnswer();
  });

  if (showHistory) {
    return (
      <List navigationTitle="Magic 8-Ball History">
        <List.Item
          title="Back to Answer"
          icon={Icon.ArrowLeft}
          actions={
            <ActionPanel>
              <Action title="Back" onAction={() => setShowHistory(false)} />
            </ActionPanel>
          }
        />
        {history.length === 0 ? (
          <List.Item title="No history yet" subtitle="Ask questions to build your history" icon={Icon.QuestionMark} />
        ) : (
          history.map((item) => (
            <List.Item
              key={item.id}
              title={item.answer}
              subtitle={item.question}
              accessories={[{ text: item.timestamp.toLocaleTimeString() }]}
              icon="🎱"
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Answer" content={item.answer} />
                  <Action.CopyToClipboard
                    title="Copy Question & Answer"
                    content={`Q: ${item.question}\nA: ${item.answer}`}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List>
    );
  }

  const title = isShaking ? "Shaking..." : `"${response}"`;
  const subtitle = `Your question: "${question}"`;

  return (
    <List navigationTitle="Magic 8-Ball">
      <List.Item
        title={title}
        subtitle={subtitle}
        icon="🎱"
        actions={
          !isShaking ? (
            <ActionPanel>
              <Action title="Ask Another Question" icon={Icon.QuestionMark} onAction={onAskAnother} />
              <Action.CopyToClipboard title="Copy Answer" content={response} />
              {history.length > 0 && (
                <Action title="View History" icon={Icon.List} onAction={() => setShowHistory(true)} />
              )}
            </ActionPanel>
          ) : undefined
        }
      />
    </List>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [questionText, setQuestionText] = useState("");

  function handleSubmit() {
    if (questionText.trim()) {
      push(<AnswerView question={questionText} onAskAnother={() => push(<Command />)} />);
    }
  }

  return (
    <Form
      navigationTitle="Ask the Magic 8-Ball"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask the Magic 8-Ball" onSubmit={handleSubmit} icon="🎱" />
          {history.length > 0 && (
            <Action
              title="View History"
              icon={Icon.List}
              onAction={() => push(<HistoryView onBack={() => push(<Command />)} />)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="question"
        title="Your Question"
        placeholder="Should I deploy today?"
        value={questionText}
        onChange={setQuestionText}
        autoFocus
      />
      <Form.Description text="Ask a yes/no question and the mystical Magic 8-Ball will reveal your answer! 🔮" />
    </Form>
  );
}

function HistoryView({ onBack }: { onBack: () => void }) {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Magic 8-Ball History">
      <List.Item
        title="Back"
        icon={Icon.ArrowLeft}
        actions={
          <ActionPanel>
            <Action title="Back" onAction={onBack} />
          </ActionPanel>
        }
      />
      {history.length === 0 ? (
        <List.Item title="No history yet" subtitle="Ask questions to build your history" icon={Icon.QuestionMark} />
      ) : (
        history.map((item) => (
          <List.Item
            key={item.id}
            title={item.answer}
            subtitle={item.question}
            accessories={[{ text: item.timestamp.toLocaleTimeString() }]}
            icon="🎱"
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Answer" content={item.answer} />
                <Action.CopyToClipboard
                  title="Copy Question & Answer"
                  content={`Q: ${item.question}\nA: ${item.answer}`}
                />
                <Action
                  title="Ask This Again"
                  icon={Icon.QuestionMark}
                  onAction={() => push(<AnswerView question={item.question} onAskAnother={() => push(<Command />)} />)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
