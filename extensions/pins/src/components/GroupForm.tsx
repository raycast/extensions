import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LaunchType,
  environment,
  launchCommand,
  useNavigation,
} from "@raycast/api";
import {
  Group,
  checkGroupNameField,
  checkGroupParentField,
  createNewGroup,
  modifyGroup,
  useGroups,
} from "../lib/Groups";
import { useState } from "react";
import { getIcon } from "../lib/icons";
import { SORT_STRATEGY } from "../lib/constants";

/**
 * Form for editing a group.
 * @param props.group The group to edit.
 * @param props.setGroups The function to call to update the list of groups.
 * @returns A form view.
 */
export default function GroupForm(props: { group?: Group; setGroups?: (groups: Group[]) => void }) {
  const { group, setGroups } = props;
  const [iconColor, setIconColor] = useState<string | undefined>(group?.iconColor);
  const [nameError, setNameError] = useState<string | undefined>();
  const [parentError, setParentError] = useState<string | undefined>();
  const { groups } = useGroups();
  const { pop } = useNavigation();

  // No group data provided -> we're creating a new group.
  const targetGroup =
    group == undefined
      ? {
          name: "",
          icon: "BulletPoints",
          id: -1,
          parent: undefined,
        }
      : group;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.ChevronRight}
            onSubmit={async (values) => {
              if (values.parentField == targetGroup.id.toString()) {
                setParentError("Group cannot be its own parent!");
                return false;
              }
              if (environment.commandName == "new-group") {
                await createNewGroup(
                  values.nameField,
                  values.iconField,
                  values.parentField ? values.parentField : undefined,
                  values.sortStrategyField && values.sortStrategyField != "none" ? values.sortStrategyField : undefined,
                  values.iconColorField
                );
                await launchCommand({
                  name: "view-groups",
                  type: LaunchType.UserInitiated,
                });
              } else {
                await modifyGroup(
                  targetGroup,
                  values.nameField,
                  values.iconField,
                  pop,
                  setGroups as (groups: Group[]) => void,
                  values.parentField ? values.parentField : undefined,
                  values.sortStrategyField && values.sortStrategyField != "none" ? values.sortStrategyField : undefined,
                  values.iconColorField
                );
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Group Name"
        placeholder="Enter the group name"
        error={nameError}
        onChange={(value) =>
          checkGroupNameField(
            value,
            setNameError,
            groups.filter((g) => g.id != targetGroup.id).map((group) => group.name)
          )
        }
        onBlur={(event) =>
          checkGroupNameField(
            event.target.value as string,
            setNameError,
            groups.filter((g) => g.id != targetGroup.id).map((group) => group.name)
          )
        }
        defaultValue={targetGroup.name}
      />

      <Form.Dropdown id="iconField" title="Group Icon" defaultValue={targetGroup.icon}>
        {["None"].concat(Object.keys(Icon)).map((icon) => {
          return <Form.Dropdown.Item key={icon} title={icon} value={icon} icon={getIcon(icon, iconColor)} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="iconColorField"
        title="Icon Color"
        onChange={(value) => setIconColor(value)}
        defaultValue={group?.iconColor ?? Color.PrimaryText}
      >
        {Object.entries(Color).map(([key, color]) => {
          return (
            <Form.Dropdown.Item
              key={key}
              title={key}
              value={color as string}
              icon={{ source: Icon.Circle, tintColor: color }}
            />
          );
        })}
      </Form.Dropdown>

      <Form.Dropdown
        id="sortStrategyField"
        title="Sort Method"
        defaultValue={targetGroup.sortStrategy}
        info="The sorting rule applied to the group. You can manually adjust the order of pins, but you can choose to have them automatically sorted alphabetically, by frequency of usage, by most recent usage, or by initial creation date."
      >
        {targetGroup.sortStrategy ? null : (
          <Form.Dropdown.Item key="none" title="Not Set (Global Preference)" value="none" />
        )}
        {Object.entries(SORT_STRATEGY).map(([key, value]) => {
          return <Form.Dropdown.Item key={key} title={value} value={key} />;
        })}
      </Form.Dropdown>

      <Form.TextField
        id="parentField"
        title="Parent Group"
        placeholder="Parent Group ID"
        defaultValue={(targetGroup.parent || "").toString()}
        info="The ID of this group's parent. You can use this to create multi-layer groupings within the menu bar dropdown menu."
        error={parentError}
        onChange={(value) => checkGroupParentField(value, setParentError, groups)}
        onBlur={(event) => checkGroupParentField(event.target.value as string, setParentError, groups)}
      />

      {targetGroup.id > -1 ? (
        <Form.TextField
          id="idField"
          title="Group ID"
          value={targetGroup.id.toString()}
          info="The ID of this group. You can use this to specify this group as a parent of other groups."
          onChange={() => null}
        />
      ) : null}
    </Form>
  );
}
