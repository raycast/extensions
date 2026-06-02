import { Action, ActionPanel, Form, useNavigation, Icon, Color, showToast, Toast } from "@raycast/api";
import { DisplayTab } from "../types";

interface RenameTabFormProps {
  tab: DisplayTab;
  onRename: (title: string) => void;
}

export function RenameTabForm({ tab, onRename }: RenameTabFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Tab"
            icon={{ source: Icon.Pencil, tintColor: Color.Blue }}
            onSubmit={(values) => {
              const newName = values.newName as string;
              onRename(newName);
              showToast({
                style: Toast.Style.Success,
                title: newName ? "Tab Renamed" : "Tab Name Reset",
                message: newName || "Restored original title",
              });
              pop();
            }}
          />
          <Action
            title="Reset to Original"
            icon={{ source: Icon.Undo, tintColor: Color.SecondaryText }}
            shortcut={{ modifiers: ["ctrl"], key: "r" }}
            onAction={() => {
              onRename("");
              showToast({
                style: Toast.Style.Success,
                title: "Tab Name Reset",
                message: "Restored original title",
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Rename tab Display: ${tab.title}`} />
      <Form.TextField
        id="newName"
        title="New Name"
        placeholder="Enter custom display name..."
        defaultValue={tab.title}
        info="This only changes the name inside Raycast. The browser's actual tab title remains unchanged."
      />
    </Form>
  );
}
