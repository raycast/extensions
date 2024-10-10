import { ActionPanel, Form, Action, Detail, useNavigation } from "@raycast/api";
import { ALL_THIRD_PARTY_IMAGES } from "./devpod";
import { useState } from "react";

export default function WorkspaceCreate() {
  const { push } = useNavigation();
  const [imagePath, setImagePath] = useState("");
  const [chooseThirdParty, setChooseThirdParty] = useState(false);
  const [thirdPartyImage, setThirdPartyImage] = useState(ALL_THIRD_PARTY_IMAGES[0]);

  const imageSource = chooseThirdParty ? thirdPartyImage : imagePath;
  const setImageSource = (source: string) => {
    if (!chooseThirdParty) {
      setImagePath(source);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Workspace"
            onSubmit={() => {
              push(<WorkspaceCreateResult imagePath={imageSource} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Set the Image Path to a URL or local path on your filesystem." />
      <Form.TextField
        id="image-path"
        key="image-path"
        title="Image Path"
        placeholder="URL or local path to image"
        value={imageSource}
        onChange={setImageSource}
      />
      <Form.Checkbox
        id="use-third-party-image"
        label="Use Third Party Image"
        value={chooseThirdParty}
        onChange={setChooseThirdParty}
        key="use-third-party-image"
      />
      <Form.Dropdown
        id="third-party-images"
        title="Third Party Images"
        key="third-party-images"
        value={thirdPartyImage}
        onChange={setThirdPartyImage}
      >
        {ALL_THIRD_PARTY_IMAGES.map((imageUrl) => {
          return (
            <Form.Dropdown.Item
              key={imageUrl}
              value={imageUrl}
              title={imageUrl.substring(imageUrl.lastIndexOf("/") + 1)}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}

interface WorkspaceCreateResultProps {
  imagePath: string;
}

function WorkspaceCreateResult({ imagePath }: WorkspaceCreateResultProps) {
  const args = ["up"];
  args.push(imagePath);

  const command = `devpod ${args.join(" ")}`;

  const output = `
### Create Workspace Command
Run the following command in your terminal:
\`\`\`bash
${command}
\`\`\`
`;

  return (
    <Detail
      markdown={output}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Command to Clipboard" content={command} />
        </ActionPanel>
      }
    />
  );
}
