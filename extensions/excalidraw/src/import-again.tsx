import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { saveCanvas, getNewSlashDate, canvasUrlExists, getCanvasKeys, getCanvasDescription } from "./utils/utils";
import { useState, useEffect } from "react";

type Values = {
  title: string;
  url: string;
  description: string;
};

interface ImportAgainProps {
  submitted: boolean;
  setSubmitted: React.Dispatch<boolean>;
}

export default function ImportAgain({ submitted, setSubmitted }: ImportAgainProps) {
  const [urlError, setUrlError] = useState<string | undefined>();

  const [checked, setChecked] = useState<boolean>(true);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [selectedDescription, setSelectedDescription] = useState<string>("");
  const [urlText, setUrlText] = useState<string | undefined>();
  const [titleError, setTitleError] = useState<string | undefined>();

  async function dropUrlError() {
    if (!urlText?.includes("excalidraw.com")) {
      setUrlError("Invalid Excalidraw URL!");
    } else if (await canvasUrlExists(urlText ?? "")) {
      setUrlError("Already in use!");
    } else {
      if (urlError) {
        setUrlError(undefined);
      }
    }
  }

  const { pop } = useNavigation();
  async function handleSubmit(values: Values) {
    if (!urlError) {
      await saveCanvas({ ...values, dateCreated: getNewSlashDate() });
      showToast({ title: "Resaved canvas!", message: "See other commands to view it." });
      setSubmitted(true);
      pop();
    }
  }

  useEffect(() => {
    if (!checked) {
      pop();
    }
  }, [checked]);
  useEffect(() => {
    getCanvasKeys(setTitleOptions);
  }, []);

  useEffect(() => {
    if (selectedTitle) {
      setTitleError(undefined);
    } else {
      setTitleError("Please select a title!");
    }

    async function getDescription() {
      const description = await getCanvasDescription(selectedTitle ?? "");
      setSelectedDescription(description);
    }
    getDescription();
  }, [selectedTitle]);

  useEffect(() => {
    dropUrlError();
  }, [urlText]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Canvas" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="resaving" label="Are you resaving a link?" value={checked} onChange={setChecked} />
      <Form.Dropdown
        error={titleError}
        id="title"
        title="Select previous title"
        defaultValue={selectedTitle}
        onChange={setSelectedTitle}
      >
        {titleOptions.map((title, index) => (
          <Form.Dropdown.Item key={index} value={title} title={title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        error={urlError}
        defaultValue={urlText}
        onChange={setUrlText}
        onBlur={async (event) => {
          if (!event.target.value?.includes("excalidraw.com")) {
            setUrlError("Invalid Excalidraw URL!");
          } else if (await canvasUrlExists(event.target.value ?? "")) {
            setUrlError("Already in use!");
          } else {
            dropUrlError();
          }
        }}
        id="url"
        title="New Canvas URL"
        placeholder="Paste the new URL of this canvas..."
      />
      {/* <Form.Separator /> */}
      <Form.TextArea
        id="description"
        title="Canvas Description"
        placeholder="Type a short description of this canvas..."
        defaultValue={selectedDescription}
      />
    </Form>
  );
}
