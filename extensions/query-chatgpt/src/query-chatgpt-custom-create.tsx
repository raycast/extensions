import * as React from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { CustomCommandCreateConfigurationParams } from "./types";

const DEEP_LINK = "raycast://extensions/cyxn/query-chatgpt/query-chatgpt-execute-custom-command";

function composeFullUrl({ prompt, gptUrl, withCustomQuery }: CustomCommandCreateConfigurationParams): string {
  const args = {
    prompt: prompt,
    gptUrl: gptUrl,
    query: withCustomQuery ? `{Query}` : "",
  };

  let result = encodeURIComponent(JSON.stringify(args));
  if (!withCustomQuery) {
    return `${DEEP_LINK}?arguments=${result}`;
  }

  // Manually replace the `{Query}` placeholder to ensure it is not encoded
  // Command will be executed both with predefined prompt and additional query provided by user — each time dynamic
  result = result.replace("%7BQuery%7D", "{Query}");

  return `${DEEP_LINK}?arguments=${result}`;
}

export default function Command() {
  const [gptUrl, setGptUrl]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [prompt, setPrompt]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [withCustomQuery, setWithCustomQuery]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(true);

  function CustomCreateAction(props: CustomCommandCreateConfigurationParams) {
    return (
      <ActionPanel>
        <Action.CreateQuicklink
          quicklink={{
            link: composeFullUrl(props),
          }}
        />
      </ActionPanel>
    );
  }

  return (
    <Form
      isLoading={false}
      actions={<CustomCreateAction prompt={prompt} gptUrl={gptUrl} withCustomQuery={withCustomQuery} />}
    >
      <Form.TextArea
        id="gptUrl"
        title="GPT URL"
        placeholder="Enter GPT URL, e.g. https://chatgpt.com/?model=text-davinci-002-render-sha"
        value={gptUrl}
        onChange={setGptUrl}
      />
      <Form.TextArea id="prompt" title="Prompt" placeholder="Enter your prompt" value={prompt} onChange={setPrompt} />
      <Form.Checkbox
        label="Allow adding additional query when executing the command"
        value={withCustomQuery}
        onChange={setWithCustomQuery}
        id="shouldOpenAfterFinished"
      />
    </Form>
  );
}
