import { Action, ActionPanel, Form, popToRoot, Toast } from "@raycast/api";
import { renameCustomTimer, renameTimer } from "./timerUtils";

export default function RenameView(props: { currentName: string; timerFile: string; ctID: string | null }) {
  const handleSubmit = async (newName: string) => {
    if (newName === "" || newName === props.currentName) {
      const toast = new Toast({ style: Toast.Style.Failure, title: "No new name given!" });
      await toast.show();
    } else {
      await popToRoot();
      if (props.timerFile == "customTimer") {
        await renameCustomTimer(props.ctID ? props.ctID : "-99", newName);
      } else {
        await renameTimer(props.timerFile, newName);
      }
      const toast = new Toast({ style: Toast.Style.Success, title: `Timer was renamed to ${newName}!` });
      await toast.show();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Timer"
            onSubmit={async (values: { newName: string }) => handleSubmit(values.newName)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="newName" title="New name" placeholder={props.currentName} />
    </Form>
  );
}
