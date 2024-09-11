import { Form, ActionPanel, Action, showToast, Toast, popToRoot, open, Icon } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { repoURL } from "./constants";
import {
  cleanSupportPath,
  downloadZip,
  extractZip,
  findFilesReplace,
  findPluginNameDirectory,
  moveDirectory,
  renameDirectory,
  directoryExists,
  validateUrl,
  validateEmail,
} from "./utils";
import { FormValues } from "./types";
import { useEffect } from "react";

export default function Command() {
  const { handleSubmit, itemProps, setValidationError, values } = useForm<FormValues>({
    async onSubmit(values) {
      // Let's check if the output directory already exists
      const exists = await directoryExists(values);
      if (exists) {
        setValidationError("outputDirectory", "The directory already exist");
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Working",
        message: "Hang on while it's baking...",
      });

      try {
        const path = await downloadZip(repoURL);
        const extractPath = await extractZip(path);
        const dirPath = await findPluginNameDirectory(extractPath);

        if (dirPath) {
          const renamePath = await renameDirectory(dirPath, values.pluginSlug);
          if (renamePath) {
            await findFilesReplace(renamePath, values);

            // Check if outputDirectory is defined and has at least one element
            if (values.outputDirectory && values.outputDirectory.length > 0) {
              await moveDirectory(renamePath, values.outputDirectory[0]);
            } else {
              throw new Error("Output directory is not defined.");
            }
          } else {
            throw new Error("Failed to rename directory.");
          }
        } else {
          throw new Error("Plugin name directory not found.");
        }

        await popToRoot();
        await open(values.outputDirectory[0]);
        toast.style = Toast.Style.Success;
        toast.title = "Success";
      } catch (error) {
        console.error(error);
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = error instanceof Error ? error.message : "An error occurred during the process.";
      } finally {
        await cleanSupportPath();
      }
    },
    validation: {
      pluginName: FormValidation.Required,
      pluginSlug: (value) => {
        if (!value) {
          return "The item is required";
        } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
          return "Slug must be lowercase and use hyphens (e.g., sample-text)";
        }
      },
      pluginURL: (value) => validateUrl(value || ""),
      authorName: FormValidation.Required,
      authorEmail: (value) => validateEmail(value || ""),
      authorURL: (value) => validateUrl(value || ""),
      outputDirectory: FormValidation.Required,
      pluginDescription: FormValidation.Required,
    },
  });

  // Custom validation for outputDirectory to check if folder already exists
  useEffect(() => {
    (async () => {
      if (values.outputDirectory) {
        const exists = await directoryExists(values);
        if (exists) {
          setValidationError("outputDirectory", "The output folder already exists");
        }
      }
    })();
  }, [values.outputDirectory]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Boilerplate" onSubmit={handleSubmit} icon={Icon.Wand} />
        </ActionPanel>
      }
      searchBarAccessory={<Form.LinkAccessory text="WPPB" target="https://wppb.me/" />}
    >
      <Form.Description text="Type your plugin details in the form below, and a custom boilerplate will be generated for you." />
      <Form.TextField title="Plugin Name" placeholder="My Awesome Extension" {...itemProps.pluginName} />
      <Form.TextField title="Plugin Slug" placeholder="awesome-extension" {...itemProps.pluginSlug} />
      <Form.TextField title="Plugin URL" placeholder="https://example.com" {...itemProps.pluginURL} />
      <Form.TextField title="Author Name" storeValue placeholder="Jill Doe" {...itemProps.authorName} />
      <Form.TextField title="Author Email" storeValue placeholder="jill@example.doe" {...itemProps.authorEmail} />
      <Form.TextField title="Author URL" storeValue placeholder="https://jill.doe" {...itemProps.authorURL} />
      <Form.TextArea
        title="Plugin Description"
        placeholder="This is my awesome extension"
        {...itemProps.pluginDescription}
      />
      <Form.FilePicker
        title="Output Directory"
        {...itemProps.outputDirectory}
        canChooseFiles={false}
        allowMultipleSelection={false}
        canChooseDirectories
      />
    </Form>
  );
}
