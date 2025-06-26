import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addDomain } from "./utils/axios-utils";
import { isEmpty } from "./utils/common-utils";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import { ActionGoShortIo } from "./components/action-go-short-io";
import Style = Toast.Style;

export default function AddDomain(props: { onAdd: () => void }) {
  const { onAdd } = props;
  const [hostname, setHostname] = useState("");
  const [hideReferer, setHideReferer] = useState(true);
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={"Add Domain"}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Plus}
            title={"Add Domain"}
            onAction={async () => {
              if (isEmpty(hostname)) {
                await showToast(Style.Failure, "Error.", "Please enter a domain to add.");
                return;
              }
              await showToast(Style.Animated, "Adding...");
              const updateResult = await addDomain(hostname, hideReferer);
              if (updateResult.success) {
                onAdd();
                pop();
                await showToast(Style.Success, "Success.", "Domain added.");
              } else {
                await showToast(Style.Failure, "Error.", updateResult.message);
              }
            }}
          />
          <ActionGoShortIo />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hostname"
        title="Hostname"
        placeholder="Enter domain (e.g. yourbrand.com)"
        onChange={setHostname}
      />
      <Form.Checkbox id="hideReferer" label="Hide Referer" onChange={setHideReferer} defaultValue={true} />
    </Form>
  );
}
