import { Action, ActionPanel, Form, Icon, Toast } from "@raycast/api";
import { copyQuestion, fetchQuestion, gameNames, QuestionType } from "./util";
import { useState } from "react";

export default function playGame() {
  const [question, setQuestion] = useState('I dare you to press the "Get Question" button!');
  const [questionType, setQuestionType] = useState("");

  async function handleSubmit({ game }: { game: QuestionType }) {
    if (game === "TOD") game = Math.random() > 0.5 ? "TRUTH" : "DARE";

    const toast = new Toast({ style: Toast.Style.Animated, title: "Fetching Question.." });
    await toast.show();

    const { question, error } = await fetchQuestion(game);

    if (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Slow down!";
      toast.message = "You're fetching questions too quickly.";
      return;
    }

    toast.hide();

    setQuestion(question);
    setQuestionType(gameNames[game]);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Question" icon={Icon.QuestionMark} onSubmit={handleSubmit} />
          <Action.SubmitForm title="Copy Question" icon={Icon.Clipboard} onSubmit={() => copyQuestion(question)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="game" title="Type of Game">
        {Object.entries(gameNames).map(([id, title], index) => (
          <Form.Dropdown.Item title={title} value={id} key={index} icon={"command-icon.png"} />
        ))}
      </Form.Dropdown>
      <Form.Description title={questionType} text={question} />
    </Form>
  );
}
