import { Action, Icon, LaunchType, launchCommand } from "@raycast/api";
import { Status } from "../utils/types";
import { contentExtractor } from "../utils/helpers";
import { useInteract } from "../hooks/useInteraction";

interface MyStatusActions {
  status: Status;
}

const MyStatusActions: React.FC<MyStatusActions> = ({ status }) => {
  const { deleteStatus } = useInteract(status);

  return (
    <>
      <Action
        title="Edit"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={async () => {
          launchCommand({
            name: "post-status",
            type: LaunchType.UserInitiated,
            context: {
              action: "edit",
              status: {
                ...status,
                status: contentExtractor(status?.content),
                visiblity: status.visibility,
              },
            },
          });
        }}
      />
      <Action
        title="Delete"
        icon={Icon.Trash}
        shortcut={{ modifiers: ["cmd"], key: "delete" }}
        onAction={() => deleteStatus(status)}
      />
    </>
  );
};
export default MyStatusActions;
