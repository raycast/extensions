import { Action, Toast, showToast, useNavigation } from "@raycast/api";
import { ModificationGrid } from "../components/result";
import { createClient } from "../utils/client";

interface ModificationValues {
  modificationPrompt: string;
}

export function ModifyAction() {
  const { push } = useNavigation();

  async function handleSubmit(values: ModificationValues) {
    if (!values.modificationPrompt) {
      showToast({
        style: Toast.Style.Failure,
        title: "No modification prompt",
        message: "Please provide a modification prompt",
      });
      return;
    }

    const client = await createClient();
    if (!client) {
      showToast({
        style: Toast.Style.Failure,
        title: "Client could not be created",
        message: "OpenAI client could not be created. Please verify the OpenAI API key.",
      });
      return;
    }
    push(<ModificationGrid modificationPrompt={values.modificationPrompt} client={client} />);
  }
  return <Action.SubmitForm title="Take Screenshot" onSubmit={handleSubmit} />;
}
