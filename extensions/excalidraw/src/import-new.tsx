import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { saveCanvas, getNewSlashDate, canvasTitleExists, canvasUrlExists } from "./utils/utils";
import { useState, useEffect } from "react";
import ImportAgain from "./import-again";

type Values = {
  title: string;
  url: string;
  description: string;
  resaving: boolean;
};

export default function Command() {
  const [titleError, setTitleError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [checked, setChecked] = useState<boolean>(false);

  const [titleText, setTitleText] = useState<string | undefined>();
  const [urlText, setUrlText] = useState<string | undefined>();

  const [submittedAgain, setSubmittedAgain] = useState<boolean>(false);

  function dropTitleError() {
    if (titleError && titleError.length > 0) {
      setTitleError(undefined);
    }
  }
  function dropUrlError() {
    if (urlError) {
      setUrlError(undefined);
    }
  }

  const { push, pop } = useNavigation();
  async function handleSubmit(values: Values) {
    if (!urlError && !titleError) {
      await saveCanvas({ ...values, dateCreated: getNewSlashDate() });
      showToast({ title: "Imported canvas!", message: "See other commands to view it." });
      pop();
    }
  }

  useEffect(() => {
    if (checked) {
      push(<ImportAgain submitted={submittedAgain} setSubmitted={setSubmittedAgain} />);
      setChecked(false);
    }
  }, [checked]);

  useEffect(() => {
    if (submittedAgain) {
      pop();
    }
  }, [submittedAgain]);

  useEffect(() => {
    async function checkForErrors() {
      if (titleText?.length == 0) {
        setTitleError("Title can't be empty!");
      } else if (await canvasTitleExists(titleText ?? "")) {
        setTitleError("Already in use!");
      } else {
        dropTitleError();
      }

      if (!urlText?.includes("excalidraw.com")) {
        setUrlError("Invalid Excalidraw URL!");
      } else if (!urlText?.includes("https://")) {
        setUrlError("Must include 'https://'!");
      } else if (await canvasUrlExists(urlText ?? "")) {
        setUrlError("Already in use!");
      } else {
        dropUrlError();
      }
    }

    checkForErrors();
  }, [urlText, titleText]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Canvas" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Note: Excalidraw canvases (for now) are read only and 'saving' it here will only allow you to access it. If you make changes at one of these links, you will need to resave it by checking the box below and updating the URL for a given title/canvas." />
      <Form.Separator />
      <Form.Checkbox id="resaving" label="Are you resaving a link?" value={checked} onChange={setChecked} />;
      <Form.TextField
        error={titleError}
        value={titleText}
        onChange={setTitleText}
        onBlur={async (event) => {
          if (event.target.value?.length == 0) {
            setTitleError("Title can't be empty!");
          } else if (await canvasTitleExists(event.target.value ?? "")) {
            setTitleError("Already in use!");
          } else {
            dropTitleError();
          }
        }}
        id="title"
        title="Canvas Title"
        placeholder="Give your canvas a name..."
        defaultValue=""
      />
      <Form.TextField
        error={urlError}
        onChange={setUrlText}
        value={urlText}
        onBlur={async (event) => {
          if (!event.target.value?.includes("excalidraw.com")) {
            setUrlError("Invalid Excalidraw URL!");
          } else if (!event.target.value?.includes("https://")) {
            setUrlError("Must include 'https://'!");
          } else if (await canvasUrlExists(event.target.value ?? "")) {
            setUrlError("Already in use!");
          } else {
            dropUrlError();
          }
        }}
        id="url"
        title="Canvas URL"
        placeholder="Paste the URL of your canvas..."
        defaultValue=""
      />
      {/* <Form.Separator /> */}
      <Form.TextArea
        id="description"
        title="Canvas Description"
        placeholder="Type a short description of this canvas..."
        defaultValue=""
      />
    </Form>
  );
}
