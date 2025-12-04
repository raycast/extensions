import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getSelectedFinderItems,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils";
import { uploadFile } from "./utils";

interface UploadFormValues {
  files: string[];
  limitDownloads: boolean;
  maxDownloads: string;
  expiry: boolean;
  expiryDays: string;
  password: string;
}

export default function Command() {
  const { handleSubmit, itemProps, setValue } = useForm<UploadFormValues>({
    async onSubmit(values) {
      if (!values.files || values.files.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "File is required" });
        return;
      }
      const allowedDownloads = values.limitDownloads ? parseInt(values.maxDownloads) : 0;
      const expiryDays = values.expiry ? parseInt(values.expiryDays) : 0;
      try {
        await showToast({ style: Toast.Style.Animated, title: "File uploading" });
        await uploadFile(values.files[0], allowedDownloads, expiryDays, values.password || "");
        await closeMainWindow({ clearRootSearch: true });
        await popToRoot();
        await showToast({ style: Toast.Style.Success, title: "File uploaded successfully" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to upload file" });
      }
    },
    validation: {
      files: FormValidation.Required,
      maxDownloads: (value: string | undefined) => {
        if (itemProps.limitDownloads.value && (!value || isNaN(Number(value)) || !Number.isInteger(Number(value)))) {
          return "Enter a valid integer";
        }
      },
      expiryDays: (value: string | undefined) => {
        if (itemProps.expiry.value && (!value || isNaN(Number(value)) || !Number.isInteger(Number(value)))) {
          return "Enter a valid integer";
        }
      },
    },
    initialValues: {
      files: [],
      limitDownloads: false,
      maxDownloads: "",
      expiry: false,
      expiryDays: "",
      password: "",
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const selectedItems = await getSelectedFinderItems();
        if (selectedItems.length > 0) {
          setValue("files", [selectedItems[0].path]);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [setValue]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Upload new file" text="This form uploads a new file to the Gokapi server" />
      <Form.FilePicker title="Select File" allowMultipleSelection={false} {...itemProps.files} />
      <Form.Separator />
      <Form.Checkbox title="Limit downloads" label="active" {...itemProps.limitDownloads} />
      {itemProps.limitDownloads.value && (
        <Form.TextField title="Max. number of downloads" placeholder="Enter an integer" {...itemProps.maxDownloads} />
      )}
      <Form.Checkbox title="Expiry" label="active" {...itemProps.expiry} />
      {itemProps.expiry.value && (
        <Form.TextField title="Number of days" placeholder="Enter an integer" {...itemProps.expiryDays} />
      )}

      <Form.Separator />
      <Form.PasswordField title="Password (optional)" {...itemProps.password} />
    </Form>
  );
}
