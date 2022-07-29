import { Form, ActionPanel, SubmitFormAction, popToRoot } from "@raycast/api";
import { useEffect, useState } from "react";
import { runAppleScript } from "run-applescript";
import Caffeinate from "./caffeinate";

interface Process {
  [key: string]: string;
}

const CaffeinateWhile = () => {
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  useEffect(() => {
    (async () => {
      const ids = (
        await runAppleScript(
          `tell application "System Events" to get the unix id of every process whose background only is false`
        )
      ).split(", ");
      const names = (
        await runAppleScript(
          `tell application "System Events" to get the name of every process whose background only is false`
        )
      ).split(", ");
      const arr: Process[] = names.map((value, index) => ({ [value]: ids[index] }));
      setProcesses(arr);
      setLoading(false);
    })();
  }, []);
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Caffeinate"
            onSubmit={async (data) => {
              await Caffeinate(`-w ${data.process}`);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="process" title="App">
        {processes.map((process) => {
          const key = Object.keys(process)[0];
          return <Form.Dropdown.Item key={key} value={process[key]} title={key} />;
        })}
      </Form.Dropdown>
    </Form>
  );
};

export default CaffeinateWhile;
