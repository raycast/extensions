import { Action, ActionPanel, Form, useNavigation, Icon } from "@raycast/api";
import { BROWSER_COLORS, getTabGroupColor } from "../helpers";

interface EditGroupFormProps {
  groupId: string | number;
  title: string;
  color: string;
  browserType: string;
  onUpdate: (groupId: string | number, title: string, color: string) => void;
}

export function EditGroupForm({ groupId, title, color, browserType, onUpdate }: EditGroupFormProps) {
  const { pop } = useNavigation();

  // dynamic keys based on browser
  const availableColors = BROWSER_COLORS[browserType] || BROWSER_COLORS.chrome;
  const colorNames = Object.keys(availableColors);

  // Map internal edge colors back to nice names if needed for default value
  let defaultColor = color;
  if (browserType === "edge") {
    if (color === "green") defaultColor = "navy";
    if (color === "red") defaultColor = "magenta";
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Group"
            icon={Icon.Checkmark}
            onSubmit={(values) => {
              let finalColor = values.color;
              if (browserType === "edge") {
                if (values.color === "navy") finalColor = "green";
                if (values.color === "magenta") finalColor = "red";
              }
              onUpdate(groupId, values.groupName, finalColor);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Edit properties for group: ${title} (${browserType})`} />
      <Form.TextField id="groupName" title="Group Name" defaultValue={title} placeholder="Group Title" />
      <Form.Dropdown id="color" title="Color" defaultValue={defaultColor}>
        {colorNames.map((name) => {
          let label = name.charAt(0).toUpperCase() + name.slice(1);
          if (browserType !== "edge" && name === "grey") {
            label = "White";
          }

          return (
            <Form.Dropdown.Item
              key={name}
              value={name}
              title={label}
              icon={{ source: Icon.Circle, tintColor: getTabGroupColor(name, browserType) }}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
