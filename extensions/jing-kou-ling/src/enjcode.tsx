import { Form, ActionPanel, Action, showToast, Toast, Clipboard } from "@raycast/api";
import axios from "axios";
import { useState } from "react";

export default function Command() {
  const [formLoading, setFormLoading] = useState(false);

  async function handleSubmit(values: { title: string; url: string }) {
    if (!values.url) {
      return showToast({
        title: "Incomplete parameters",
        message: "Please enter the link that needs to generate code to submit",
        style: Toast.Style.Failure,
      });
    }
    if (!values.title) {
      values.title = "Welcome to the zoo";
    }
    setFormLoading(true);
    const { data } = await axios.post("https://api.jds.codes/jd/gencode", { ...values });
    if (data.code === 200) {
      setFormLoading(false);
      Clipboard.copy(data.data.code);
      showToast({ title: "generated", message: "code copied to clipboard", style: Toast.Style.Success });
    } else {
      setFormLoading(false);
      showToast({ title: "generate failed", message: data.msg, style: Toast.Style.Failure });
    }
  }

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm onSubmit={handleSubmit} title="generate" />
          </ActionPanel>
        }
        isLoading={formLoading}
      >
        <Form.Description title="Generate JD code" text="Generate your own JD code" />
        <Form.TextField id="title" title="title" placeholder="please enter your title " />
        <Form.TextField id="url" title="link" placeholder="please enter your link for generate JD code" />
      </Form>
    </>
  );
}
