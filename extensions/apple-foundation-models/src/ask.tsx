import { Action, ActionPanel, Form, Icon, LaunchProps, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { ChatView } from "./components/ChatView";
import { ResultView } from "./components/ResultView";
import { SelectedTextCommand, TextTaskContext } from "./components/SelectedTextCommand";
import { respond } from "./lib/fm";
import { toTextTask } from "./lib/prompts";
import { getChatStore, getDefaultInstructions } from "./lib/storage";

function quote(text: string) {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function AnswerView({ question }: { question: string }) {
  const { push } = useNavigation();
  const instructions = getDefaultInstructions();
  // The chat is saved once per answer, so pressing Continue in Chat again opens the same chat.
  const savedChat = useRef<{ id: string; answer: string }>(undefined);

  return (
    <ResultView
      navigationTitle="Ask"
      header={quote(question)}
      task={(runOptions) => respond({ prompt: question, instructions }, runOptions)}
      extraActions={(answer) => (
        <Action
          title="Continue in Chat"
          icon={Icon.SpeechBubble}
          shortcut={{ modifiers: ["cmd"], key: "j" }}
          onAction={async () => {
            if (savedChat.current?.answer !== answer) {
              const store = getChatStore();
              const now = new Date().toISOString();
              const chat = store.create(instructions, [
                { role: "user", content: question, createdAt: now },
                { role: "assistant", content: answer, createdAt: now },
              ]);
              await store.save(chat);
              savedChat.current = { id: chat.id, answer };
            }
            push(<ChatView chatId={savedChat.current.id} />);
          }}
        />
      )}
    />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Ask; launchContext?: TextTaskContext }>) {
  const { push } = useNavigation();
  const question = props.arguments.question?.trim();
  const [questionError, setQuestionError] = useState<string>();
  // A text command found no selected text and handed its task over, to run on the clipboard text here.
  const textTask = toTextTask(props.launchContext?.textTask);

  if (textTask) {
    return <SelectedTextCommand task={textTask} clipboardOnly />;
  }
  if (question) {
    return <AnswerView question={question} />;
  }

  return (
    <Form
      navigationTitle="Ask"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            icon={Icon.QuestionMarkCircle}
            onSubmit={(values: { question: string }) => {
              const typed = values.question.trim();
              if (!typed) {
                setQuestionError("Type a question first");
                return;
              }
              push(<AnswerView question={typed} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What would you like to know?"
        error={questionError}
        onChange={() => setQuestionError(undefined)}
      />
      <Form.Description text="The answer is written by Apple's on-device model. It runs on this Mac, so nothing leaves it." />
    </Form>
  );
}
