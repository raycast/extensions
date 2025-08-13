import { Action, ActionPanel, Clipboard, Detail, Form, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import EnvDropdown from "./ui/EnvDropdown";
import OutputFormatDropdown from "./ui/OutputFormatDropdown";
import { Environment, OutputFormat, envToArg, runMontra, runMontraJSON } from "./utils/exec";

interface Values {
  environment: Environment;
  partnerId: string;
  name: string;
  scopes?: string[];
  rateLimit?: string;
  json?: string;
  output: OutputFormat;
}

export default function Command() {
  const [markdown, setMarkdown] = useState<string | undefined>();
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: submit,
    validation: {
      environment: FormValidation.Required,
      partnerId: FormValidation.Required,
      name: FormValidation.Required,
      output: FormValidation.Required,
    },
  });

  async function submit(values: Values) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating API Key" });
    try {
      let args = ["api-key", "create", ...envToArg(values.environment)];
      let content: { key?: string } | undefined;
      if (values.json && values.json.trim().length > 0) {
        args = args.concat(["--json", values.json]);
      } else {
        args.push("--partner-id", values.partnerId, "--name", values.name);
        if (values.scopes && values.scopes.length > 0) args.push("--scopes", values.scopes.join(","));
        if (values.rateLimit && values.rateLimit.trim().length > 0) args.push("--rate-limit", values.rateLimit);
      }

      if (values.output === "json") {
        const json = await runMontraJSON<unknown>(args);
        content = json && typeof json === "object" ? (json as { key?: string }) : undefined;
        setMarkdown("```json\n" + JSON.stringify(json, null, 2) + "\n```");
      } else {
        const { stdout } = await runMontra(args);
        setMarkdown("```\n" + stdout + "\n```");
      }

      toast.style = Toast.Style.Success;
      toast.title = "API key created";
      if (content?.key) {
        await Clipboard.copy(content.key);
      }
    } catch (e: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create API key";
      toast.message = e instanceof Error ? e.message : undefined;
    }
  }

  return (
    <Detail
      isLoading={false}
      navigationTitle="API Key: Create"
      markdown={markdown || "Fill the form and submit to create an API key."}
      actions={
        <ActionPanel>
          <Action.Push
            title="Open Create Form"
            target={
              <Form
                actions={
                  <ActionPanel>
                    <Action.SubmitForm title="Create API Key" onSubmit={handleSubmit} />
                  </ActionPanel>
                }
              >
                <EnvDropdown />
                <Form.TextField title="Partner ID" {...itemProps.partnerId} />
                <Form.TextField title="Name" {...itemProps.name} />
                <Form.TagPicker id="scopes" title="Scopes">
                  <Form.TagPicker.Item value="read" title="read" />
                  <Form.TagPicker.Item value="write" title="write" />
                </Form.TagPicker>
                <Form.TextField id="rateLimit" title="Rate Limit (rpm)" placeholder="e.g. 60" />
                <Form.TextArea id="json" title="Raw JSON Payload (overrides above)" enableMarkdown />
                <OutputFormatDropdown />
              </Form>
            }
          />
        </ActionPanel>
      }
    />
  );
}
