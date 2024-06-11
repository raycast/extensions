import { Form, ActionPanel, Action, showToast, Clipboard, Toast } from "@raycast/api";

import { fromBech32, toHex, fromHex, toBech32 } from "@cosmjs/encoding";

type Values = {
  address: string;
  prefix: string;
};

export default function Command() {
  function handleSubmit(values: Values) {
    let converted = toBech32(values.prefix, fromBech32(values.address).data);

     Clipboard.copy(converted).then(() => {
      showToast({ title: "Converted address copied to clipboard", message: converted });
     }).catch((error) => {
      showToast({ title: "Error", message: "Ran into an error while copying the address " + error, style: Toast.Style.Failure});
     })
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a Bech32 address" />
      <Form.TextField id="address" title="Bech32 address" placeholder="cosmos1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a" defaultValue="cosmos1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a" />
      <Form.TextField id="prefix" title="Desired prefix" placeholder="neutron" defaultValue="neutron" />
    </Form>
  );
}
