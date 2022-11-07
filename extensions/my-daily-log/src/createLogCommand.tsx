import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { createDailyLog } from "./createDailyLog";

interface CreateLogArguments {
  title: string;
}

export default function Command(props: { arguments: CreateLogArguments }) {
  const createLogAndExit = (title: string): void => {
    if (title.length === 0) {
      showToast(Toast.Style.Failure, "Title is required", "Please enter a title");
      return;
    }
    createDailyLog(title);
    popToRoot();
    showToast(Toast.Style.Success, "Log added", title);
  };

  const { title } = props.arguments;

  if (title) {
    createLogAndExit(title);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: any) => {
              createLogAndExit(values.title);
            }}
          />
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
