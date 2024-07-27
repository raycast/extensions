import { useState } from "react";
import { ActionPanel, Action, Form, popToRoot } from "@raycast/api";
import { AuthenticateNewOrgFormData } from "../models/models";
import { authorizeOrg } from "../utils/sf";

export function AuthenticateNewOrg() {
  const [orgType, setOrgType] = useState<string>();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: AuthenticateNewOrgFormData) => {
              if (values.type === "sandbox") {
                values.url = "test.salesforce.com";
              } else if (values.type === "prod") {
                values.url = "login.salesforce.com";
              }
              authorizeOrg(values).then(() => {
                popToRoot();
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Authenticating a New Salesforce Org"
        text="Choose the org type, an org alias, and label. When you hit submit, your browser should open. "
      />
      <Form.Dropdown id="type" title="Org Type" onChange={(option) => setOrgType(option)}>
        <Form.Dropdown.Item value="sandbox" title="Sandbox" icon="🏝️" />
        <Form.Dropdown.Item value="custom" title="Custom" icon="🚀" />
        <Form.Dropdown.Item value="prod" title="Production" icon="💼" />
        <Form.Dropdown.Item value="dev" title="Developer Hub" icon="💻" />
      </Form.Dropdown>
      {orgType === "custom" ? <Form.TextField id="url" title="Custom URL" defaultValue="" /> : <></>}
      <Form.TextField id="alias" title="Org Alias" />
      <Form.TextField id="label" title="Label" />
    </Form>
  );
}
