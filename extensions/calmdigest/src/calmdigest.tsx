import { Form, ActionPanel, Action, showToast, popToRoot, open } from "@raycast/api";

type Values = {
  textfield: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    console.log(values);
    showToast({ title: "Your link has been digested", message: "See logs for submitted values" });
    popToRoot();
    open(`https://calmdigest.com/?q=${encodeURIComponent(values.textfield.toString())}`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="This form generates a Calmdigest article" />
      <Form.TextField id="textfield" title="Article link" placeholder="Enter URL of your article" defaultValue="" />
    </Form>
  );
}
