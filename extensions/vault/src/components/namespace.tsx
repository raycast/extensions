import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { CopyToken, OpenVault, setNamespaceAndGoToTree } from "./actions";

export function VaultNamespace() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Cog}
            title="Set Namespace"
            onSubmit={(values: { namespace: string }) => setNamespaceAndGoToTree(values, push)}
          />
          <CopyToken />
          <OpenVault />
        </ActionPanel>
      }
    >
      <Form.TextField id="namespace" title="Namespace (optional)" storeValue />
    </Form>
  );
}
