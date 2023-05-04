import { Toast } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { Form, ActionPanel, Action, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { saveLink } from "./utils/api";

type Values = {
  url: string;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: Values) {
    try {
      setIsLoading(true);

      const savedLink = await saveLink(values.url);
      setIsLoading(false);

      if (savedLink.status === "error") {
        showToast({ title: "Unable to save this link", style: Toast.Style.Failure });
        console.log(savedLink);
        return;
      }

      showToast({ title: "Link saved !" });
    } catch (e) {
      setIsLoading(false);
      showToast({ title: "Something went wrong", style: Toast.Style.Failure });
    }
  }

  const [urlValue, setUrlValue] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (text && text !== "" && text.includes("https://")) {
        setUrlValue(text);
      }
    });
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Save this URL"
        placeholder="URL"
        value={urlValue}
        onChange={(value) => setUrlValue(value)}
      />
    </Form>
  );
}
