import { randomUUID } from "crypto";
import { useRef } from "react";
import { Form, ActionPanel, Action, showToast, showHUD, popToRoot } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { saveBucketConfig, setLastUsedBucket } from "./lib/storage";
import { BucketConfig } from "./lib/types";

type Values = {
  accessKey: string;
  secretKey: string;
  bucketName: string;
  temporaryFiles?: boolean;
};

export default function Command() {
  const processedRef = useRef(false);

  const { handleSubmit, itemProps, setValue } = useForm<Values>({
    onSubmit: async (values) => {
      const { accessKey, secretKey, bucketName, temporaryFiles } = values;
      const bucketRefId = randomUUID();
      const config: BucketConfig = {
        bucketRefId,
        accessKey,
        secretKey,
        bucketName,
        temporaryFiles,
      };
      await saveBucketConfig(config);
      // When setting up a bucket, make it the last used so subsequent commands preselect it
      await setLastUsedBucket(bucketRefId);
      await showHUD(`Bucket set up: ${bucketName}${temporaryFiles ? " (temporary)" : ""}`);
      await popToRoot();
    },
    validation: {
      accessKey: FormValidation.Required,
      secretKey: FormValidation.Required,
      bucketName: (value) => {
        if (!value) return "The item is required";
        // 3-63 characters, start/end alphanumeric, hyphens allowed inside
        const isValid = /^(?=.{3,63}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/i.test(value);
        if (!isValid) return "Bucket name must be 3-63 chars, alphanumeric or hyphen";
      },
    },
  });

  // Handle text change to detect pasted credentials
  const handleTextChange = (text: string, fieldName: "accessKey" | "secretKey") => {
    // Check if the pasted text contains both credentials in the expected format
    if (!processedRef.current && text.includes("EDGE_STORE_ACCESS_KEY=") && text.includes("EDGE_STORE_SECRET_KEY=")) {
      try {
        // Parse credentials in format:
        // EDGE_STORE_ACCESS_KEY=xxx
        // EDGE_STORE_SECRET_KEY=xxx
        const accessKeyMatch = text.match(/EDGE_STORE_ACCESS_KEY=([^\r\n\s]+)/);
        const secretKeyMatch = text.match(/EDGE_STORE_SECRET_KEY=([^\r\n\s]+)/);

        if (accessKeyMatch && secretKeyMatch) {
          const accessKey = accessKeyMatch[1].trim();
          const secretKey = secretKeyMatch[1].trim();

          if (accessKey && secretKey) {
            processedRef.current = true;
            setValue("accessKey", accessKey);
            setValue("secretKey", secretKey);
            showToast({
              title: "Credentials filled",
              message: "Access and secret keys populated from paste",
            });
            return;
          }
        }
      } catch (error) {
        // Silently fail if parsing fails
        console.error("Failed to parse credentials:", error);
      }
    }

    // Normal behavior - just update the field
    setValue(fieldName, text);
    processedRef.current = false;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Setup an EdgeStore bucket by entering credentials and bucket name." />
      <Form.TextField
        title="Access Key"
        placeholder="Enter access key"
        {...itemProps.accessKey}
        onChange={(text) => handleTextChange(text, "accessKey")}
      />
      <Form.PasswordField
        title="Secret Key"
        placeholder="Enter secret key"
        {...itemProps.secretKey}
        onChange={(text) => handleTextChange(text, "secretKey")}
      />
      <Form.TextField
        title="Bucket Name"
        placeholder="Enter bucket name"
        info={
          `* Private buckets are not supported.\n` +
          `* If the bucket doesn't exist, it will be created automatically on first upload.`
        }
        {...itemProps.bucketName}
      />
      <Form.Checkbox
        label="Mark uploads as temporary"
        {...itemProps.temporaryFiles}
        info="Uploaded files will be deleted after 24 hours"
      />
    </Form>
  );
}
