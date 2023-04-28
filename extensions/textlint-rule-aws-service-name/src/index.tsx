import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
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
    const kernel = new TextlintKernel();
    const options = getOptions();
    const result = await kernel.lintText(values.input, options);
    const messages = result.messages.map((message) => {
      return `${message.message}`;
    });
    if (messages.length === 0) {
      showToast(Toast.Style.Success, "Check Result", "Input text is valid");
    }
    const lintResult = messages.join("\n");
    setLintResult(lintResult);
    const fixedResult = await kernel.fixText(values.input, options);
    const fixed = fixedResult.output;
    setFixed(fixed);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={runTextLint} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Input" placeholder="Please enter the text you wish to check" />
      <Form.Separator />
      <Form.TextArea id="fixed" title="Fixed Result" value={fixed} />
      <Form.TextArea id="lintResult" title="Check Result" value={lintResult} />
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
