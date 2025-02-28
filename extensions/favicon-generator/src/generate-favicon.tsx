import { Action, ActionPanel, Form, launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { generateFavicon } from "./favicon-generator";

interface FaviconFormValues {
  iconPath: string[];
  appTitle: string;
  themeColor: string;
  path: string;
  outputPath: string[];
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FaviconFormValues>({
    async onSubmit(values) {
      try {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Generating favicons..." });

        const htmlSnippets = await generateFavicon(values.iconPath[0], values.outputPath[0], [], {
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
    },
    validation: {
      iconPath: (value) => {
        if (!value || value.length === 0) return "Icon path is required";
      },
      appTitle: FormValidation.Required,
      themeColor: (value) => {
        if (!value) return "Theme color is required";
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return "Please enter a valid hex color (e.g., #FFFFFF)";
      },
      path: FormValidation.Required,
      outputPath: (value) => {
        if (!value || value.length === 0) return "Output path is required";
      },
    },
  });

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
      <Form.FilePicker
        {...itemProps.iconPath}
        id="iconPath"
        title="Icon Path"
        allowMultipleSelection={false}
        storeValue={true}
      />
      <Form.TextField
        {...itemProps.appTitle}
        id="appTitle"
        title="App Title"
        placeholder="Enter app title"
        storeValue={true}
      />
      <Form.TextField
        {...itemProps.themeColor}
        id="themeColor"
        title="Theme Color"
        placeholder="Enter theme color (e.g., #FFFFFF)"
        defaultValue="#FFFFFF"
        storeValue={true}
      />
      <Form.TextField
        {...itemProps.path}
        id="path"
        title="Path"
        placeholder="Enter path"
        defaultValue="/"
        info="The path where the favicons will be served from"
        storeValue={true}
      />
      <Form.FilePicker
        {...itemProps.outputPath}
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
