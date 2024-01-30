import { useState } from "react";
import ActionVersionList from "./action-version-list";
import ActionDataList from "./action-data-list";
import { List } from "@raycast/api";
import ActionContextList from "./action-context-list";
import ActionSkillList from "./action-skill-list";

export const ACTION_VIEW_STATE = ["Data", "Version", "Skill", "Context"] as const;
export type ActionViewState = (typeof ACTION_VIEW_STATE)[number];

export const ActionViewDropdown = ({ onChange }: { onChange: (value: ActionViewState) => void }) => {
  return (
    <List.Dropdown
      tooltip="Select a view"
      onChange={(id) => {
        const view = ACTION_VIEW_STATE.find((_) => _ === id);
        if (view === undefined || !view) return onChange(ACTION_VIEW_STATE[0]);
        onChange(view);
      }}
    >
      {ACTION_VIEW_STATE.map((view) => (
        <List.Dropdown.Item key={view} value={view} title={view} />
      ))}
    </List.Dropdown>
  );
};

const ActionView = ({ guid }: { guid: string }) => {
  const [state, setState] = useState<ActionViewState>("Data");

  switch (state) {
    case "Version":
      return <ActionVersionList guid={guid} onChange={setState} />;
    case "Context":
      return <ActionContextList guid={guid} onChange={setState} />;
    case "Skill":
      return <ActionSkillList guid={guid} onChange={setState} />;
    default:
      return <ActionDataList guid={guid} onChange={setState} />;
  }
};

export default ActionView;
