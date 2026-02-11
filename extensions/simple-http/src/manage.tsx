import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { DEFAULT_DIRECTORY, DEFAULT_PORT, getProcesses, startServer, stopServer } from "./util";
import { useState } from "react";

interface FormValues {
  port: string;
  directory: string[];
}

function shortenLeft(text: string, maxLength: number): string {
  return text.length > maxLength ? "..." + text.slice(-maxLength) : text;
}

export default function Command() {
  const proc = getProcesses();
  const command = proc.length > 0 ? proc[0].command : "";

  const preferences = getPreferenceValues();
  const defaultPort = preferences.port || DEFAULT_PORT;
  const defaultDirectory = preferences.directory || DEFAULT_DIRECTORY;
  const currentPort = command.replace(/.*-m http\.server (\d+) .*/, "$1");
  const currentDirectory = command.replace(/.*--directory (.+)/, "$1");

  const [targetUrl, setTargetUrl] = useState(proc.length > 0 ? "http://localhost:" + currentPort : "");

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (proc.length > 0) {
        const toast = await showToast({
          title: "Stopping...",
          style: Toast.Style.Animated,
        });

        try {
          stopServer({ status: true });
          setTargetUrl("");
          toast.style = Toast.Style.Success;
          toast.title = "Success";
          toast.message = "Simple HTTP stopped";
        } catch (error) {
          showFailureToast(error, { title: "Error", message: String(error) });
          return;
        }
      } else {
        const toast = await showToast({
          title: "Starting...",
          style: Toast.Style.Animated,
        });

        try {
          startServer({ port: Number(values.port), directory: values.directory, status: true });
          setTargetUrl("http://localhost:" + values.port);
          toast.style = Toast.Style.Success;
          toast.title = "Success";
          toast.message = `Serving ${shortenLeft(values.directory[0], 20)} on port ${values.port}`;
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Error";
          toast.message = String(error);
          return;
        }
      }
    },
    validation: {
      port: FormValidation.Required,
      directory: FormValidation.Required,
    },
    initialValues: {
      port: currentPort || defaultPort,
      directory: currentDirectory !== "" ? [currentDirectory] : [defaultDirectory],
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          {proc.length > 0 ? (
            <Action.SubmitForm title="Stop" onSubmit={handleSubmit} />
          ) : (
            <Action.SubmitForm title="Start" onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
      searchBarAccessory={
        targetUrl !== "" ? <Form.LinkAccessory target={targetUrl} text="Open served directory" /> : null
      }
    >
      <Form.TextField title="Port Number" {...itemProps.port} />
      <Form.FilePicker
        title="Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.directory}
      />
    </Form>
  );
}
