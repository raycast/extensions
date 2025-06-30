import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { SpaceMembersView } from "../views/SpaceMembersView";
import { NewSpaceForm } from "../views/NewSpaceForm";
import { SpaceTagsView } from "../views/SpaceTagsView";
import { SpaceDetailView } from "../views/SpaceDetailView";
import { trpc } from "../utils/trpc.util";
import { SpaceAuthForm } from "../views/SpaceAuthForm";

export const SpaceItemActionPanel = (props: {
  refetch: () => void;
  spaceId: string;
  enabled: boolean;
  authenticated: boolean;
  toggleSpace: (spaceId: string) => void;
  // TODO: Use Prisma Type here
  type: "PERSONAL" | "TEAM";
}) => {
  const { spaceId, refetch, type, enabled, authenticated, toggleSpace } = props;

  const leave = trpc.space.leave.useMutation();
  const handleLeave = async () => {
    const confirmed = await confirmAlert({
      title: "Leave Space",
      message:
        "Are you sure you want to leave this space? This is irreversible and can only be rejoined by invitation from space members.",
      primaryAction: {
        title: "Leave",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    leave.mutate(
      { spaceId },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "You have left the space",
          });
          refetch();
        },
      },
    );
  };

  if (!authenticated) {
    return (
      <ActionPanel>
        <Action.Push
          title="Re-authenticate"
          icon={Icon.Lock}
          target={<SpaceAuthForm spaceId={spaceId} needPop />}
          onPop={refetch}
        />
        <Action
          title={"Leave Space"}
          shortcut={Keyboard.Shortcut.Common.Remove}
          icon={Icon.Xmark}
          onAction={handleLeave}
        />
      </ActionPanel>
    );
  }

  return (
    <ActionPanel>
      <Action.Push
        title="Open Space Detail"
        icon={Icon.Info}
        target={<SpaceDetailView spaceId={spaceId} />}
        onPop={refetch}
      />
      <Action.Push
        title="Tags"
        icon={Icon.Tag}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        target={<SpaceTagsView spaceId={spaceId} />}
      />

      <Action
        title={enabled ? "Disable Space" : "Enable Space"}
        icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
        shortcut={{ modifiers: ["ctrl"], key: "d" }}
        onAction={() => toggleSpace(spaceId)}
      />

      {type === "TEAM" && (
        <>
          <Action.Push
            title="Members"
            icon={Icon.TwoPeople}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            target={<SpaceMembersView spaceId={spaceId} />}
          />
          <Action
            title={"Leave Space"}
            shortcut={Keyboard.Shortcut.Common.Remove}
            icon={Icon.Xmark}
            onAction={handleLeave}
          />
        </>
      )}
      {/* TODO: Additional features planned */}
      {/* <Action title={"Copy Invitation Link"} onAction={() => console.log("Copy invitation link")} /> */}
      {/* <Action title={"Delete Space"} onAction={() => console.log("Delete Space")} /> */}
      <ActionPanel.Section>
        <Action.Push
          title="Add New Space"
          icon={Icon.Plus}
          target={<NewSpaceForm />}
          shortcut={Keyboard.Shortcut.Common.New}
          onPop={refetch}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
};
