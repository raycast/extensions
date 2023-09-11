import { Action, ActionPanel, Form, popToRoot, Toast } from "@raycast/api";
import { renameStopwatch } from "./stopwatchUtils";
import { renameCustomTimer, renameTimer } from "./timerUtils";

export default function RenameView(props: { currentName: string; originalFile: string; ctID: string | null }) {
  const handleSubmit = (newName: string) => {
    if (newName === "" || newName === props.currentName) {
      const toast = new Toast({ style: Toast.Style.Failure, title: "No new name given!" });
      toast.show();
    } else {
      popToRoot();
      switch (props.originalFile) {
        case "customTimer":
          renameCustomTimer(props.ctID ? props.ctID : "-99", newName);
          break;
        case "stopwatch":
          renameStopwatch(props.ctID ? props.ctID : "-99", newName);
          break;
        default:
          renameTimer(props.originalFile, newName);
          break;
      }
      const toast = new Toast({ style: Toast.Style.Success, title: `Renamed to ${newName}!` });
      toast.show();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={(values: { newName: string }) => handleSubmit(values.newName)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="newName" title="New name" placeholder={props.currentName} />
    </Form>
  );
}
