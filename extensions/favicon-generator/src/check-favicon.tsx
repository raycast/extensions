import { Action, ActionPanel, Form, LaunchProps, showToast, Toast } from "@raycast/api";
import { checkFavicon } from "./favicon-generator";

export default function Command(
  props: LaunchProps<{ arguments: Arguments.CheckFavicon; launchContext: { htmlSnippets: string } }>,
) {
  const { port } = props.arguments;
  const { htmlSnippets } = props.launchContext ?? {};

  const handleSubmit = async function handleSubmit(values: { port: string }) {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Checking favicons..." });

      const result = await checkFavicon(values.port);

      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Favicon check completed. Check the logs for results.";

      // Log the detailed results
      console.log(result);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error checking favicons",
        message:
          error instanceof Error && error.message.includes("undici")
            ? "No web app found on that port"
            : error instanceof Error
              ? error.message
              : "Unknown error occurred",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Check Favicon"
    >
      <Form.Description text="Check favicons on your website." />
      {htmlSnippets && (
        <Form.TextArea
          id="htmlSnippets"
          title="HTML Snippets"
          defaultValue={htmlSnippets}
          info="The HTML snippets to paste into your website!"
        />
      )}
      <Form.TextField
        id="port"
        title="Port"
        placeholder="Enter port number (e.g., 3000)"
        defaultValue={port}
        info="The port where your website is running locally"
        storeValue={true}
      />
    </Form>
  );
}
