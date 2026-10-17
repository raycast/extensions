import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
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
  const handleSubmit = async (newName: string) => {
    if (newName === "" || newName === props.currentName) {
      await showError(new Error("Enter a different name"), { title: "Could Not Rename" });
    } else {
      try {
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

        await showHudOrToast({ msg: `Renamed to ${newName}!`, launchedFromMenuBar: false, isErr: false });
        pop();
      } catch (error) {
        await showError(error, { title: "Could Not Rename" });
      }
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
