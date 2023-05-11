import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, Icon, Clipboard } from "@raycast/api";
import { TextlintKernel, TextlintKernelOptions } from "@textlint/kernel";
import * as pluginMarkdown from "@textlint/textlint-plugin-markdown";
import * as awsRule from "textlint-rule-aws-service-name";

type Values = {
  input: string;
};

export default function Command() {
  const [lintResult, setLintResult] = useState<string>("");
  const [fixed, setFixed] = useState<string>("");

  async function runTextLint(values: Values) {
    if (values.input === "") {
      showToast(Toast.Style.Failure, "Input text is required");
      return;
    }

    const kernel = new TextlintKernel();
    const options = getOptions();
    const result = await kernel.lintText(values.input, options);
    const messages = result.messages.map((message) => {
      return `${message.message}`;
    });

    const lintResult = messages.join("\n");
    setLintResult(lintResult);
    const fixedResult = await kernel.fixText(values.input, options);
    const fixed = fixedResult.output;
    setFixed(fixed);
    await Clipboard.copy(fixed);
    await showToast(Toast.Style.Success, "Copied to clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={runTextLint} title="Submit and Copy Result" icon={Icon.Wand} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Please enter the text you wish to check" />
      {fixed && (
        <>
          <Form.Separator />
          <Form.TextArea
            id="lintResult"
            onChange={(e) => {
              console.log(e);
            }}
            title="Check Result"
            value={lintResult}
          />
          <Form.TextArea
            id="fixed"
            title="Copied Result"
            onChange={(e) => {
              console.log(e);
            }}
            value={fixed}
          />
        </>
      )}
    </Form>
  );
}

function getOptions(): TextlintKernelOptions {
  const options: TextlintKernelOptions = {
    ext: ".md",
    plugins: [
      {
        pluginId: "markdown",
        plugin: pluginMarkdown.default,
      },
    ],
    rules: [
      {
        ruleId: "aws-service-name",
        rule: awsRule.default,
      },
    ],
  };
  return options;
}
