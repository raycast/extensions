import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { NestCamera } from "../types";
import { CameraView } from "./CameraView";
import { OAuthManager } from "../services/auth/OAuthManager";

interface CameraListProps {
  cameras: NestCamera[];
  isLoading: boolean;
}

export function CameraList({ cameras, isLoading }: CameraListProps): JSX.Element {
  const handleSignOut = async () => {
    const authManager = OAuthManager.getInstance();
    await authManager.clearTokens();
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cameras..."
      actions={
        <ActionPanel>
          <Action
            title="Sign Out"
            icon={Icon.Logout}
            onAction={handleSignOut}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        </ActionPanel>
      }
    >
      {cameras.map((camera) => (
        <List.Item
          key={camera.id}
          title={camera.name}
          subtitle={camera.roomHint}
          icon={camera.traits.online ? Icon.CircleFilled : Icon.Circle}
          accessories={[
            {
              text: camera.traits.online ? "Online" : "Offline",
              icon: camera.traits.online ? Icon.CheckCircle : Icon.XMarkCircle
            }
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Camera"
                target={<CameraView camera={camera} />}
                icon={Icon.Video}
              />
              <Action
                title="Set as Quick Access"
                icon={Icon.Star}
                onAction={() => {/* TODO: Implement quick access */}}
              />
              <Action
                title="Sign Out"
                icon={Icon.Logout}
                onAction={handleSignOut}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
} 