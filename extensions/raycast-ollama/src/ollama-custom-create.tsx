import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { Creativity } from "./lib/enum";
import { GetModelsName } from "./lib/ui/function";
import * as React from "react";
import { ValidationKeepAlive } from "./lib/ui/valitadion";
import { InfoKeepAlive } from "./lib/ui/info";

const p = getPreferenceValues<Preferences>();
if (!p.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

interface FormData {
  prompt: string;
  server: string;
  model: string;
  creativity: string;
  keep_alive: string;
}

export default function Command(): JSX.Element {
  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModelsName, []);
  const { itemProps } = useForm<FormData>({
    onSubmit() {
      () => {
        return;
      };
    },
    initialValues: {
      creativity: String(Creativity.Medium),
      keep_alive: "5m",
    },
    validation: {
      server: FormValidation.Required,
      model: FormValidation.Required,
      prompt: FormValidation.Required,
      creativity: FormValidation.Required,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
    },
  });

  const [CheckboxAdvanced, SetCheckboxAdvanced]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] =
    React.useState(false);

  const InfoServer = "Ollama Server";
  const InfoModel = "Ollama Model";
  const InfoCreativity = `Creativity Level:
- None: 0
- Low: 0.2
- Medium: 0.8 (Ollama Default)
- High: 1.5
- Maximum: 2`;
  const InfoPrompt = `Prompt Template, you can download public prompt form prompts.ray.so.
The following tags are supported:
- {selection}: Add selected text or clipboard to the prompt.
- {browser-tab}: Add current browser tab text to the prompt. Use {browser-tab format="markdown|html|text"} if you need a different format from Markdown. The Raycast Browser Extension is required.
- {image}: Add image on clipboard to the prompt. A model with vision capability is required.`;

  const ActionView = (
    <ActionPanel>
      <Action.CreateQuicklink
        quicklink={{
          link: `raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-custom-command?arguments=${encodeURIComponent(
            JSON.stringify({
              prompt: itemProps.prompt.value,
              model: `${itemProps.server.value}:${itemProps.model.value}`,
              parameters: JSON.stringify({
                creativity: itemProps.creativity.value,
                keep_alive: CheckboxAdvanced && itemProps.keep_alive.value,
              }),
            })
          )}`,
        }}
      />
    </ActionPanel>
  );

  return (
    <Form isLoading={IsLoadingModel} actions={!IsLoadingModel && Model && ActionView}>
      {!IsLoadingModel && Model && (
        <Form.Dropdown title="Server" info={InfoServer} {...itemProps.server}>
          {[...Model.keys()].sort().map((s) => (
            <Form.Dropdown.Item title={s} value={s} key={s} />
          ))}
        </Form.Dropdown>
      )}
      {!IsLoadingModel && Model && itemProps.server.value && (
        <Form.Dropdown title="Model" info={InfoModel} {...itemProps.model}>
          {[...Model.entries()]
            .filter((v) => v[0] === itemProps.server.value)[0][1]
            .sort()
            .map((s) => (
              <Form.Dropdown.Item title={s} value={s} key={s} />
            ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown title="Creativity" info={InfoCreativity} {...itemProps.creativity}>
        <Form.Dropdown.Item title="None" value={String(Creativity.None)} key={Creativity.None} />
        <Form.Dropdown.Item title="Low" icon={Icon.StackedBars1} value={String(Creativity.Low)} key={Creativity.Low} />
        <Form.Dropdown.Item
          title="Medium"
          icon={Icon.StackedBars2}
          value={String(Creativity.Medium)}
          key={Creativity.Medium}
        />
        <Form.Dropdown.Item
          title="High"
          icon={Icon.StackedBars3}
          value={String(Creativity.High)}
          key={Creativity.High}
        />
        <Form.Dropdown.Item
          title="Maximum"
          icon={Icon.StackedBars4}
          value={String(Creativity.Maximum)}
          key={Creativity.Maximum}
        />
      </Form.Dropdown>
      <Form.TextArea title="Prompt" placeholder="Enter your prompt" info={InfoPrompt} {...itemProps.prompt} />
      <Form.Checkbox
        id="advanced"
        label="Advanced Settings"
        defaultValue={CheckboxAdvanced}
        onChange={SetCheckboxAdvanced}
      />
      {CheckboxAdvanced && <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />}
    </Form>
  );
}
