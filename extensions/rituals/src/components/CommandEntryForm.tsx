import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { CommandEntry } from "../lib/profiles";

interface Props {
  entry?: CommandEntry;
  onSave: (entry: CommandEntry) => void;
}

export default function CommandEntryForm({ entry, onSave }: Props) {
  const { pop } = useNavigation();
  const [run, setRun] = useState(entry?.run ?? "");
  const [waitFor, setWaitFor] = useState(entry?.waitFor ?? "");
  const [stop, setStop] = useState(entry?.stop ?? "");
  const [stopWaitFor, setStopWaitFor] = useState(entry?.stopWaitFor ?? "");

  function submit() {
    if (!run.trim() && !stop.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Add a run or stop command" });
      return;
    }
    onSave({
      run: run.trim(),
      waitFor: waitFor.trim() || undefined,
      stop: stop.trim() || undefined,
      stopWaitFor: stopWaitFor.trim() || undefined,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={entry ? "Edit Command" : "Add Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="run"
        title="Run"
        placeholder="docker start my-db"
        value={run}
        onChange={setRun}
        info="Runs when you activate the ritual."
      />
      <Form.TextField
        id="waitFor"
        title="Wait until ready (optional)"
        placeholder="docker info"
        value={waitFor}
        onChange={setWaitFor}
        info="Before running, wait until this check passes — e.g. wait for Docker to be up."
      />
      <Form.TextField
        id="stop"
        title="Stop on deactivate (optional)"
        placeholder="docker stop my-db"
        value={stop}
        onChange={setStop}
        info="The opposite command, run when you deactivate the ritual. Stops run before apps quit."
      />
      <Form.TextField
        id="stopWaitFor"
        title="Wait before stop (optional)"
        placeholder="docker info"
        value={stopWaitFor}
        onChange={setStopWaitFor}
        info="On deactivate, wait until this check passes before running the stop command."
      />
    </Form>
  );
}
