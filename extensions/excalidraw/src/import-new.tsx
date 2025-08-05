import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { saveCanvas, getNewSlashDate, canvasTitleExists, canvasUrlExists } from "./utils/utils";
import { useState, useEffect } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import ImportAgain from "./import-again";

type Values = {
  title: string;
  url: string;
  description: string;
  resaving: boolean;
};

export default function Command() {
  const [checked, setChecked] = useState<boolean>(false);

  const [urlText, setUrlText] = useState<string | undefined>();

  const [submittedAgain, setSubmittedAgain] = useState<boolean>(false);

  const [urlExists, setUrlExists] = useState<boolean>(false);

  const { push, pop } = useNavigation();

  async function saveCavnasWrap(values: Values) {
    await saveCanvas({ ...values, dateCreated: getNewSlashDate() });
  }

  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(values) {
      saveCavnasWrap(values);
      showToast({ title: "Imported canvas!", message: "See other commands to view it." });
      pop();
    },
    validation: {
      title: FormValidation.Required,
      url: (url) => {
        if (!url?.includes("excalidraw.com")) {
          return "Invalid Excalidraw URL!";
        } else if (!url?.includes("https://")) {
          return "Must include 'https://'!";
        } else if (urlExists) {
          return "Already in use!";
        } else {
          return undefined;
        }
      },
      description: FormValidation.Required,
    },
  });

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

  async function checkURL() {
    setUrlExists(await canvasUrlExists(urlText ?? ""));
  }
  useEffect(() => {
    checkURL();
  }, [urlText]);

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
      <Form.Checkbox id="resaving" label="Are you resaving a link?" value={checked} onChange={setChecked} />
      <Form.TextField {...itemProps.title} id="title" title="Canvas Title" placeholder="Give your canvas a name..." />
      <Form.TextField {...itemProps.url} id="url" title="Canvas URL" placeholder="Paste the URL of your canvas..." />
      {/* <Form.Separator /> */}
      <Form.TextArea
        {...itemProps.description}
        id="description"
        title="Canvas Description"
        placeholder="Type a short description of this canvas..."
      />
    </Form>
  );
}
