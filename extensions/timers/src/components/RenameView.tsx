import { Action, ActionPanel, Form, Toast, useNavigation } from "@raycast/api";
import { renameStopwatch } from "../backend/stopwatchBackend";
import { renameCustomTimer, renameTimer } from "../backend/timerBackend";
import { showHudOrToast } from "../backend/utils";

interface RenameViewProps {
  currentName: string;
  originalFile: string;
  ctID: string | null;
}

function RenameView(props: RenameViewProps) {
  const { pop } = useNavigation();
  const handleSubmit = (newName: string) => {
    if (newName === "" || newName === props.currentName) {
      const toast = new Toast({ style: Toast.Style.Failure, title: "No new name given!" });
      toast.show();
    } else {
      pop();
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

      showHudOrToast({ msg: `Renamed to ${newName}!`, launchedFromMenuBar: false, isErr: false });
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

export { type RenameViewProps, RenameView };
