import { Form, ActionPanel, Action, popToRoot, showToast, Toast } from "@raycast/api";
import { getSecrets, parseSecrets, storeSecrets } from "./helper/secrets";
import { DEFAULT_PATH, createEntePath, exportEnteAuthSecrets } from "./helper/ente";

interface PathValues {
  path?: string;
}

export default function Command() {
  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: PathValues) => {
              createEntePath(DEFAULT_PATH);
              exportEnteAuthSecrets();
              const secrets = parseSecrets(getSecrets(values.path || `"${DEFAULT_PATH}/ente_auth.txt"`));
              storeSecrets(secrets);

              if (storeSecrets.length > 0) {
                showToast({
                  style: Toast.Style.Success,
                  title: "Secrets imported",
                  message: `${values.path} was imported successfully.`,
                }).then(() => popToRoot());
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title="Path" defaultValue={`${DEFAULT_PATH}/ente_auth.txt`} />
    </Form>
  );
}
