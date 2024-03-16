import { OllamaApiTags } from "./api/ollama";
import * as React from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";

const DeepLink = new Map([
  ["🔧 Command", "raycast://extensions/massimiliano_pasquini/raycast-ollama/ollama-custom-command"],
]);

export default function Command(): JSX.Element {
  const [CommandType, setCommandType]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [Model, setModel]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [Image, setImage]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [Prompt, setPrompt]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const {
    data: InstalledModels,
    isLoading: IsLoadingInstalledModels,
    revalidate: RevalidateInstalledModels,
  } = usePromise(GetInstalledModels, [Image], {
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });

  async function GetInstalledModels(image: boolean) {
    const response = await OllamaApiTags();
    if (image) {
      return response.models.filter((t) => (t.details.families ? t.details.families.find((t) => t === "clip") : false));
    } else {
      return response.models;
    }
  }

  function CustomCrateAction(props: { link: string; prompt: string; image: string; model: string }): JSX.Element {
    return (
      <ActionPanel>
        <Action.CreateQuicklink
          quicklink={{
            link: `${props.link}?arguments=${encodeURIComponent(
              JSON.stringify({ prompt: props.prompt, image: props.image, model: props.model })
            )}`,
          }}
        />
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    RevalidateInstalledModels();
  }, [Image]);

  return (
    <Form
      isLoading={IsLoadingInstalledModels}
      actions={
        InstalledModels && (
          <CustomCrateAction
            link={DeepLink.get(CommandType) as string}
            prompt={Prompt}
            image={Image ? "yes" : "no"}
            model={Model}
          />
        )
      }
    >
      <Form.Dropdown id="CommandType" title="Command Type" onChange={setCommandType}>
        {Array.from(DeepLink).map((item) => {
          return <Form.Dropdown.Item key={item[0]} title={item[0]} value={item[0]} />;
        })}
      </Form.Dropdown>
      <Form.Checkbox id="Image" title="Image" label="Enable Image as Input" value={Image} onChange={setImage} />
      <Form.Dropdown id="Model" title="Model" onChange={setModel}>
        {InstalledModels &&
          InstalledModels.map((item) => {
            return <Form.Dropdown.Item key={item.name} title={item.name} value={item.name} />;
          })}
      </Form.Dropdown>
      <Form.TextArea id="Prompt" title="Prompt" placeholder="Enter your prompt" value={Prompt} onChange={setPrompt} />
    </Form>
  );
}
