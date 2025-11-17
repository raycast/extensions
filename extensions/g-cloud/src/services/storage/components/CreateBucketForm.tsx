import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

interface CreateBucketFormProps {
  projectId: string;
  gcloudPath: string;
  onBucketCreated: () => void;
  onCancel: () => void;
  generateUniqueBucketName: (purpose?: string) => string;
}

function validateBucketName(name: string): { isValid: boolean; error?: string } {
  if (!name) {
    return { isValid: false, error: "Bucket name is required" };
  }

  if (name.length < 3 || name.length > 63) {
    return { isValid: false, error: "Bucket name must be between 3 and 63 characters" };
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name)) {
    return {
      isValid: false,
      error:
        "Bucket name must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number",
    };
  }

  if (name.includes("..") || name.includes("-.") || name.includes(".-")) {
    return { isValid: false, error: "Bucket name cannot contain consecutive dots or mix of dots and hyphens" };
  }

  if (name.includes("goog") || name.includes("google")) {
    return { isValid: false, error: "Bucket name cannot contain 'goog' or 'google'" };
  }

  return { isValid: true };
}

export default function CreateBucketForm({
  projectId,
  gcloudPath,
  onBucketCreated,
  onCancel,
  generateUniqueBucketName,
}: CreateBucketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedName, setSuggestedName] = useState(generateUniqueBucketName("storage"));
  const [nameError, setNameError] = useState<string | undefined>();

  function regenerateName() {
    setSuggestedName(generateUniqueBucketName("storage"));
    setNameError(undefined);
  }

  function handleNameChange(name: string) {
    const validation = validateBucketName(name);
    setNameError(validation.error);
  }

  async function handleSubmit(values: {
    name: string;
    location: string;
    storageClass: string;
    publicAccess: boolean;
    uniformAccess: boolean;
  }) {
    const validation = validateBucketName(values.name);
    if (!validation.isValid) {
      showFailureToast("Validation Error", {
        title: "Invalid Bucket Name",
        message: validation.error || "Please check bucket name requirements",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let command = `${gcloudPath} storage buckets create gs://${values.name} --location=${values.location} --storage-class=${values.storageClass} --project=${projectId}`;

      if (values.publicAccess) {
        command += " --public-access";
      }

      if (values.uniformAccess) {
        command += " --uniform-bucket-level-access";
      }

      const { stderr } = await execPromise(command);

      if (stderr && stderr.includes("ERROR")) {
        throw new Error(stderr);
      }

      showToast({
        style: Toast.Style.Success,
        title: "Bucket created successfully",
        message: `Created bucket: ${values.name}`,
      });

      onBucketCreated();
    } catch (error) {
      console.error("Error creating bucket:", error);
      showFailureToast("Failed to create bucket", {
        title: "Failed to create bucket",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Bucket" onSubmit={handleSubmit} />
          <Action title="Regenerate Name" onAction={regenerateName} />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Bucket Name"
        placeholder="my-unique-bucket-name"
        info="Must be globally unique, lowercase, 3-63 characters, using only letters, numbers, and hyphens"
        defaultValue={suggestedName}
        error={nameError}
        onChange={handleNameChange}
      />

      <Form.Dropdown id="location" title="Location" defaultValue="us-central1">
        <Form.Dropdown.Section title="Multi-Region">
          <Form.Dropdown.Item value="us" title="United States (us)" />
          <Form.Dropdown.Item value="eu" title="European Union (eu)" />
          <Form.Dropdown.Item value="asia" title="Asia (asia)" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Regions">
          <Form.Dropdown.Item value="us-central1" title="Iowa (us-central1)" />
          <Form.Dropdown.Item value="us-east1" title="South Carolina (us-east1)" />
          <Form.Dropdown.Item value="us-west1" title="Oregon (us-west1)" />
          <Form.Dropdown.Item value="europe-west1" title="Belgium (europe-west1)" />
          <Form.Dropdown.Item value="asia-east1" title="Taiwan (asia-east1)" />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.Dropdown
        id="storageClass"
        title="Storage Class"
        defaultValue="STANDARD"
        info="Determines pricing and availability"
      >
        <Form.Dropdown.Item value="STANDARD" title="Standard" />
        <Form.Dropdown.Item value="NEARLINE" title="Nearline" />
        <Form.Dropdown.Item value="COLDLINE" title="Coldline" />
        <Form.Dropdown.Item value="ARCHIVE" title="Archive" />
      </Form.Dropdown>

      <Form.Checkbox
        id="uniformAccess"
        label="Uniform Bucket-Level Access"
        defaultValue={true}
        info="Use IAM permissions instead of ACLs (recommended)"
      />

      <Form.Checkbox
        id="publicAccess"
        label="Public Access"
        defaultValue={false}
        info="WARNING: Makes bucket publicly accessible"
      />
    </Form>
  );
}
