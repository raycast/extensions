import { Action, ActionPanel, Form, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { submitAnswer } from "../lib/aoc";

type Props = { year: number; day: number; part: 1 | 2; onCorrect: () => void };
type Values = { answer: string };

export function SubmitForm({ year, day, part, onCorrect }: Props) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: submit,
    validation: { answer: (value) => (value?.trim() ? undefined : "Enter your answer") },
  });

  async function submit(values: Values) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Submitting part ${part}…` });
    try {
      const result = await submitAnswer(year, day, part, values.answer);
      toast.message = result.message;
      if (result.status === "correct") {
        toast.style = Toast.Style.Success;
        toast.title = part === 1 ? "That's the right answer! ⭐" : "Puzzle complete! ⭐⭐";
        onCorrect();
        pop();
      } else if (result.status === "wait") {
        toast.style = Toast.Style.Failure;
        toast.title = "You answered too recently";
      } else if (result.status === "solved") {
        toast.style = Toast.Style.Failure;
        toast.title = "This part is already solved";
        await popToRoot();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "That's not the right answer";
      }
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Couldn't submit your answer" });
    }
  }

  return (
    <Form
      navigationTitle={`Day ${day} · Part ${part}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Advent of Code ${year}, day ${day}, part ${part}`} />
      <Form.TextField title="Answer" placeholder="Your answer" autoFocus {...itemProps.answer} />
    </Form>
  );
}
