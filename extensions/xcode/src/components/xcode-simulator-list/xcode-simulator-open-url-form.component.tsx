import { XcodeSimulator } from "../../models/xcode-simulator/xcode-simulator.model";
import { Action, ActionPanel, Clipboard, Form } from "@raycast/api";
import { useEffect, useState } from "react";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

export function XcodeSimulatorOpenUrlForm(props: { simulator: XcodeSimulator }) {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    Clipboard.readText().then((url) => (url && XcodeSimulatorService.isValidUrl(url) ? setUrl(url) : undefined));
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open URL"
            onSubmit={() =>
              operationWithUserFeedback(
                "Opening URL in Simulator",
                "URL successfully opened in simulator",
                "An error occurred while trying to open the url",
                () => XcodeSimulatorService.openUrl(url, props.simulator.udid)
              ).then()
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="maps://"
        value={url}
        onChange={setUrl}
        info="The url which should be opened in the simulator e.g. maps://"
      />
    </Form>
  );
}
