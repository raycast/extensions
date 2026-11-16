import { useState } from "react";
import { quickLinkDescription, validateQuickLink } from "./jwt";
import { Action, ActionPanel, Detail, Form, useNavigation, environment, showToast, Toast } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";

function QuickLinkPreview({ name, jwt }: { name: string; jwt: string }) {
  const link = createDeeplink({
    command: "editor",
    extensionName: environment.extensionName,
    ownerOrAuthorName: environment.ownerOrAuthorName,
    context: { jwt },
  });

  return (
    <Detail
      navigationTitle="Create Quick Link"
      markdown={quickLinkDescription(name)}
      actions={
        <ActionPanel>
          <Action.CreateQuicklink quicklink={{ name, link }} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle="Create JWT Quick Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue"
            onSubmit={({ name, jwt }: { name: string; jwt: string }) => {
              try {
                const values = validateQuickLink(name, jwt);
                setError(undefined);
                push(<QuickLinkPreview {...values} />);
              } catch (error) {
                const message = error instanceof Error ? error.message : "Invalid quick link";
                setError(message);
                showToast({ style: Toast.Style.Failure, title: "Invalid quick link", message });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Dev Token" />
      <Form.TextArea
        error={error}
        onChange={() => setError(undefined)}
        id="jwt"
        title="JWT Token"
        placeholder="Paste the JWT token to pre-fill when opened..."
      />
      <Form.Description text="Creates a Raycast quick link that opens the JWT Editor with this token pre-filled." />
    </Form>
  );
}
