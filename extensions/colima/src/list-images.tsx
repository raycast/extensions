import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { PullImageForm } from "./components/PullImageForm";
import { RunContainerForm } from "./components/RunContainerForm";
import { useDependencyCheck } from "./hooks/useDependencyCheck";
import { useDockerImages } from "./hooks/useDockerImages";
import { dockerRmi } from "./utils/cli";

export default function Command() {
  const { colimaAvailable, dockerAvailable, isChecking } = useDependencyCheck({ colima: true, docker: true });
  const { data: images, isLoading, revalidate } = useDockerImages();

  if (!isChecking && !colimaAvailable) {
    return (
      <List>
        <List.EmptyView
          title="Colima Not Found"
          description="Colima is not installed or not in your PATH. Install it with: brew install colima"
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Install Colima" url="https://colima.run/docs/installation/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!isChecking && !dockerAvailable) {
    return (
      <List>
        <List.EmptyView
          title="Docker Not Available"
          description="Docker CLI is not found or Docker is not running. Start a Colima instance first."
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Colima Documentation" url="https://colima.run/docs/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function removeImage(id: string, force: boolean) {
    try {
      const confirmed = await confirmAlert({
        title: force ? "Force Remove Image" : "Remove Image",
        message: "Are you sure you want to remove this image?",
        primaryAction: {
          title: force ? "Force Remove" : "Remove",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Removing image...",
      });

      await dockerRmi(id, force);
      toast.style = Toast.Style.Success;
      toast.title = "Image removed";

      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove image",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function refreshImages() {
    try {
      await revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh images",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search images...">
      {images.map((image) => {
        const isDangling = image.repository === "<none>";
        const imageName = `${image.repository}:${image.tag}`;

        return (
          <List.Item
            key={image.id}
            id={image.id}
            title={isDangling ? "Dangling Image" : imageName}
            subtitle={image.id.slice(0, 12)}
            icon={isDangling ? Icon.Warning : Icon.Document}
            accessories={[{ text: image.size }, { text: image.createdSince }]}
            keywords={[image.repository, image.tag, image.id]}
            actions={
              <ActionPanel>
                {!isDangling && (
                  <Action.Push
                    title="Run Container from Image"
                    icon={Icon.Play}
                    target={<RunContainerForm initialImage={imageName} />}
                  />
                )}
                <Action.Push title="Pull Image" icon={Icon.Download} target={<PullImageForm />} />
                <Action
                  title="Remove Image"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                  style={Action.Style.Destructive}
                  onAction={() => removeImage(image.id, false)}
                />
                <Action title="Force Remove Image" icon={Icon.Trash} onAction={() => removeImage(image.id, true)} />
                <Action.CopyToClipboard title="Copy Image Id" icon={Icon.Clipboard} content={image.id} />
                {!isDangling && (
                  <Action.CopyToClipboard title="Copy Image Name" icon={Icon.Clipboard} content={imageName} />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={refreshImages}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        title="No Docker Images"
        description="Pull an image to get started."
        actions={
          <ActionPanel>
            <Action.Push title="Pull Image" icon={Icon.Download} target={<PullImageForm />} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refreshImages}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
