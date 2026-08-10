import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { NewDailyLog } from "./domain/dailyLog/NewDailyLog";
import { createNewLogUseCaseFactory } from "./factories/createNewLogUseCaseFactory";
import { randomPlaceholder } from "./shared/randomPlaceholder";

interface CreateLogArguments {
  title: string;
}

export default function Command(props: { arguments: CreateLogArguments }) {
  const createLogAndExit = (title: string): void => {
    createNewLogUseCaseFactory().execute(new NewDailyLog(title, new Date()));

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

interface FormData {
  title: string;
}
