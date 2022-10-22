import { Form, ActionPanel, Action } from "@raycast/api";
import cronstrue from "cronstrue";
import { useEffect, useState } from "react";

export default function main() {
  const [cron, setCron] = useState("* * * * *");
  const [cronError, setCronError] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    (async () => {
      function update(error: string, description: string) {
        setCronError(error);
        setDescription(description);
      }
      try {
        update("", cronstrue.toString(cron));
      } catch (err) {
        update("Invalid expression", "");
      }
    })();
  }, [cron]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={description} />
        </ActionPanel>
      }
    >
      <Form.TextField id="cron" title="Cron" value={cron} onChange={setCron} error={cronError} autoFocus />
      <Form.Description title="Description" text={description} />
    </Form>
  );
}
