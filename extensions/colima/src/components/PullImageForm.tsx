import { Form, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { dockerPull } from "../utils/cli";

interface PullImageFormValues {
  image: string;
}

async function handleSubmit(values: PullImageFormValues) {
  const rawImage = values.image ?? "";
  const image = rawImage.trim();

  if (!image || /\s/.test(rawImage)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid image reference",
      message: "Image cannot be empty or contain spaces",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Pulling ${image}...`,
  });

  try {
    await dockerPull(image);
    toast.style = Toast.Style.Success;
    toast.title = `Successfully pulled ${image}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to pull image";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export function PullImageForm() {
  return (
    <Form
      navigationTitle="Pull Docker Image"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Pull Image" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Pull a Docker image from a registry. Supports Docker Hub, GitHub Container Registry, and other registries." />
      <Form.TextField
        id="image"
        title="Image"
        placeholder="e.g. nginx, postgres:16, ghcr.io/org/repo:latest"
        info="Enter the image reference including optional tag or digest"
      />
    </Form>
  );
}
