import { ActionPanel, Form, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import ActStream from "./ActStream";
import fs from "fs";
import path from "path";
import { getApiKey } from "./utils";

interface SetupFormValues {
  prompt: string;
  startingPage?: string;
  returnSchema?: string;
  headless: boolean;
  recordBrowser: boolean;
}

function maybeCreateLogsDirectory() {
  const logsPath = path.resolve(__dirname, "logs");

  // If logs directory doesn't exist, create it.
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
  }
}

function maybeWrapStartingPage(startingPage: string | undefined) {
  if (startingPage === undefined || startingPage.trim() === "") return;

  if (!startingPage.startsWith("http")) {
    return `https://${startingPage}`;
  }
  return startingPage;
}

function validateJsonSchema(input?: string) {
  if (input === undefined || input.trim() === "") {
    return;
  }

  try {
    JSON.parse(input);
  } catch {
    return "Return Schema is invalid json";
  }
  return;
}

const sampleJsonSchema = {
  type: "object",
  properties: {
    price: {
      type: "string",
    },
  },
};

export default function Setup() {
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<SetupFormValues>({
    async onSubmit(values) {
      const apiKey = getApiKey();

      if (apiKey === undefined) {
        await showToast({
          title: "No API Key",
          message: "Please enter your Nova Act API Key in the preferences setting!",
          style: Toast.Style.Failure,
        });
        return;
      }

      maybeCreateLogsDirectory();

      const startingPage = maybeWrapStartingPage(values.startingPage);

      // Start nova act session with ActStream
      push(
        <ActStream
          apiKey={apiKey}
          prompt={values.prompt}
          startingPage={startingPage}
          returnSchema={values.returnSchema}
          headless={values.headless}
          recordBrowser={values.recordBrowser}
        />,
      );
    },
    validation: {
      prompt: FormValidation.Required,
      returnSchema: validateJsonSchema,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Task to run"
        placeholder="e.g. Go to Amazon and search for a coffee maker"
        storeValue={true}
        {...itemProps.prompt}
      />
      <Form.TextField
        title="Starting Page (optional)"
        placeholder="https://..."
        {...itemProps.startingPage}
        storeValue={true}
      />
      <Form.TextArea
        title="Return JSON Schema (optional)"
        placeholder={JSON.stringify(sampleJsonSchema)}
        {...itemProps.returnSchema}
        storeValue={true}
      />
      <Form.Checkbox
        label="Headless mode"
        {...itemProps.headless}
        storeValue={true}
        info="Whether to run the browser in headless mode"
      />
      <Form.Checkbox
        label="Record browser"
        {...itemProps.recordBrowser}
        storeValue={true}
        info="Whether to save a screen recording of the browser in action. If true, the recording will be saved in the logs directory"
      />
    </Form>
  );
}
