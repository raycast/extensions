import { Icon, MenuBarExtra, showHUD } from "@raycast/api";
import { Group } from "../lib/Groups";
import { useCachedState } from "@raycast/utils";
import { StorageKey } from "../lib/constants";

type TargetGroupMenuProps = {
  groups: Group[];
};

export default function TargetGroupMenu(props: TargetGroupMenuProps) {
  const { groups } = props;
  const [targetGroup, setTargetGroup] = useCachedState<Group | undefined>(StorageKey.TARGET_GROUP, undefined);

  let title = "Target Group";
  if (targetGroup) {
    title = `Target Group: ${targetGroup.name}`;
  } else {
    title = "Target Group: None";
  }

  return (
    <MenuBarExtra.Submenu title={title} key="target_group" icon={Icon.Folder}>
      <MenuBarExtra.Item
        key="none"
        icon={targetGroup ? Icon.Minus : Icon.Checkmark}
        title="None"
        onAction={async () => {
          setTargetGroup(undefined);
          await showHUD("Set Target Group to None");
        }}
      />
      {groups.map((group) => {
        return (
          <MenuBarExtra.Item
            key={group.id}
            icon={targetGroup?.id == group.id ? Icon.Checkmark : Icon.Folder}
            title={group.name}
            onAction={async () => {
              setTargetGroup(group);
              await showHUD(`Set Target Group to ${group.name}`);
            }}
          />
        );
      })}
    </MenuBarExtra.Submenu>
  );
}
