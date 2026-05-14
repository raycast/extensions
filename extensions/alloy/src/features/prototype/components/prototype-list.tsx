import { PrototypeForList, PrototypeTypeToIcon } from "@/types/prototype";
import { Action, ActionPanel, Icon, List, open, showToast, Toast, popToRoot, Color } from "@raycast/api";

import { usePrototypes } from "../api/use-prototype";
import { client } from "@/features/auth/api/oauth";
import { formatDateForList } from "@/lib/utils";

const PrototypeListItem = ({ prototype }: { prototype: PrototypeForList }) => {
  const onOpenInBrowser = () => {
    open(prototype.alloyUrl);
  };
  return (
    <List.Item
      id={prototype.prototypeId}
      title={
        prototype.title
          ? prototype.title
          : prototype.type.toLowerCase().trim() === "other"
            ? "Prototype"
            : `${prototype.type.charAt(0).toUpperCase() + prototype.type.slice(1)} Prototype`
      }
      icon={PrototypeTypeToIcon(prototype.type)}
      accessories={[
        {
          tag: {
            value:
              prototype.type.toLowerCase().trim() === "other"
                ? "Other"
                : prototype.type.charAt(0).toUpperCase() + prototype.type.slice(1),
            color: prototype.type.toLowerCase().trim() === "other" ? Color.Red : Color.Blue,
          },
        },
        {
          text: `${prototype.createdAt ? `${formatDateForList(prototype.createdAt)}` : ""}`,
        },

        {
          icon: {
            source: prototype.createdBy.avatarUrl ? prototype.createdBy.avatarUrl : Icon.PersonCircle,
            tintColor: Color.Purple,
          },
          tooltip: `${prototype.createdBy.name ? `Created by ${prototype.createdBy.name}` : "Unknown creator"}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action title="Open in Browser" icon={Icon.Globe} onAction={() => onOpenInBrowser()} />
          <ActionPanel.Section>
            <Action
              title="Sign out of Alloy"
              icon={Icon.Logout}
              style={Action.Style.Destructive}
              onAction={async () => {
                await client.removeTokens();
                await showToast({ style: Toast.Style.Success, title: "Logged out successfully" });
                await popToRoot();
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export const PrototypeList = () => {
  const { prototypes, isLoadingPrototypes } = usePrototypes();
  return (
    <List isLoading={isLoadingPrototypes}>
      {prototypes?.map((prototype) => (
        <PrototypeListItem key={prototype.prototypeId} prototype={prototype} />
      ))}
    </List>
  );
};
