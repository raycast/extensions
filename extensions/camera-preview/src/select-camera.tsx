import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { listCameras } from "swift:../swift";
import { getDefaultCameraId, setDefaultCameraId } from "./storage";

/// Mirrors `CameraInfo` in the Swift package. The generated binding is untyped, so restate it here.
interface Camera {
  id: string;
  name: string;
}

export default function Command() {
  const { isLoading, data, error } = usePromise(listCameras);
  const cameras: Camera[] = data ?? [];
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    getDefaultCameraId().then(setSelectedId);
  }, []);

  async function select(id: string, name: string) {
    await setDefaultCameraId(id);
    setSelectedId(id);
    await showToast({ style: Toast.Style.Success, title: "Default camera set", message: name });
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not list cameras"
          description={error instanceof Error ? error.message : String(error)}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon={Icon.Camera}
        title="First Available Camera"
        subtitle="Use whichever camera macOS reports first"
        accessories={selectedId === "" ? [{ icon: Icon.Check }] : []}
        actions={
          <ActionPanel>
            <Action
              title="Use First Available Camera"
              icon={Icon.Check}
              onAction={() => select("", "First available")}
            />
          </ActionPanel>
        }
      />
      {cameras.map((camera) => (
        <List.Item
          key={camera.id}
          icon={Icon.Video}
          title={camera.name}
          accessories={selectedId === camera.id ? [{ icon: Icon.Check }] : []}
          actions={
            <ActionPanel>
              <Action title="Set as Default Camera" icon={Icon.Check} onAction={() => select(camera.id, camera.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
