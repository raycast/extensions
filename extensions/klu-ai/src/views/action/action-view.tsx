import { useActionState } from "@/hooks/use-action";
import { Icon, List } from "@raycast/api";
import ActionContextList from "./action-context-list";
import ActionDataList from "./action-data-list";
import ActionSkillList from "./action-skill-list";
import ActionVersionList from "./action-version-list";

export const ACTION_VIEW_STATE = ["Data", "Version", "Skill", "Context"] as const;
export type ActionViewState = (typeof ACTION_VIEW_STATE)[number];

export const ActionViewDropdown = ({ onChange }: { onChange: (value: ActionViewState) => void }) => {
  return (
    <List.Dropdown
      tooltip="Select a view"
      storeValue
      onChange={(id) => {
        const view = ACTION_VIEW_STATE.find((_) => _ === id);
        if (view === undefined || !view) return onChange(ACTION_VIEW_STATE[0]);
        onChange(view);
      }}
    >
      {ACTION_VIEW_STATE.map((view) => (
        <List.Dropdown.Item key={view} value={view} title={view} icon={Icon.Window} />
      ))}
    </List.Dropdown>
  );
};

const ActionView = ({ guid }: { guid: string }) => {
  const { state, setState } = useActionState(guid);

  const props = {
    guid,
    onChange: setState,
  };

  switch (state) {
    case "Version":
      return <ActionVersionList {...props} />;
    case "Context":
      return <ActionContextList {...props} />;
    case "Skill":
      return <ActionSkillList {...props} />;
    default:
      return <ActionDataList {...props} />;
  }
};

export default ActionView;
