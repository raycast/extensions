import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { createDailyLog } from "./domain/createDailyLog";
import { useForm } from "@raycast/utils";

interface CreateLogArguments {
  title: string;
}

export default function Command(props: { arguments: CreateLogArguments }) {
  const createLogAndExit = (title: string): void => {
    createDailyLog(title);
    popToRoot();
    showToast(Toast.Style.Success, "Log added", title);
  };

  const { title: argumentTitle } = props.arguments;
  if (argumentTitle) {
    createLogAndExit(argumentTitle);
  }

  const { handleSubmit } = useForm<FormData>({
    onSubmit: ({ title }) => createLogAndExit(title),
    validation: {
      title: (title) => {
        if (title?.length === 0) {
          return "Title is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="What did you do?" placeholder={randomPlaceholder()} />
    </Form>
  );
}

function randomPlaceholder(): string {
  const options = [
    "Completed a TODO",
    "Wrote a blog post",
    "Wrote a Raycast extension",
    "Had a meeting with a client",
    "Went to the gym",
    "Ate a peanut butter sandwich",
  ];

  return options[Math.floor(Math.random() * options.length)];
}

interface FormData {
  title: string;
}
