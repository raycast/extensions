import { Action, ActionPanel, Form, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { generateFavicon } from "./favicon-generator";

export default function Command() {
  const [appTitle, setAppTitle] = useState("");

  async function handleSubmit(values: {
    iconPath: string;
    appTitle: string;
    themeColor: string;
    path: string;
    outputPath: string;
  }) {
    try {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Generating favicons..." });

      const htmlSnippets = await generateFavicon(values.iconPath, values.outputPath, [], {
        icon: {
          desktop: { regularIconTransformation: { type: "none" }, darkIconType: "none" },
          touch: { transformation: { type: "none" }, appTitle: values.appTitle },
          webAppManifest: {
            transformation: { type: "none" },
            backgroundColor: values.themeColor,
            name: values.appTitle,
            shortName: values.appTitle,
            themeColor: values.themeColor,
          },
        },
        path: values.path,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Success!";
      toast.message = "Favicons generated successfully. Favicon HTML tags copied to clipboard!";

      launchCommand({
        name: "check-favicon",
        type: LaunchType.UserInitiated,
        arguments: {
          port: "3000",
        },
        context: {
          htmlSnippets: htmlSnippets,
        },
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error generating favicons",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      searchBarAccessory={<Form.LinkAccessory target="https://realfavicongenerator.net/" text="Open Web Version" />}
      navigationTitle="Generate Favicon"
    >
      <Form.Description text="Generate favicons for your website or application." />
      <Form.FilePicker id="iconPath" title="Icon Path" allowMultipleSelection={false} storeValue={true} />
      <Form.TextField
        id="appTitle"
        title="App Title"
        placeholder="Enter app title"
        value={appTitle}
        onChange={setAppTitle}
        storeValue={true}
      />
      <Form.TextField
        id="themeColor"
        title="Theme Color"
        placeholder="Enter theme color (e.g., #FFFFFF)"
        defaultValue="#FFFFFF"
        storeValue={true}
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="Enter path"
        defaultValue="/"
        info="The path where the favicons will be served from"
        storeValue={true}
      />
      <Form.FilePicker
        id="outputPath"
        title="Output Path"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        info="The directory where favicon files will be generated"
        storeValue={true}
      />
    </Form>
  );
}
