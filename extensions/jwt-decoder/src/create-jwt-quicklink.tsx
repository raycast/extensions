import { Action, ActionPanel, Detail, Form, Icon, List, useNavigation } from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { decodeJwtWithItems } from "./utils/decode-jwt";
import { forgetQuicklinkToken, listQuicklinkTokens, saveQuicklinkToken } from "./utils/jwt-quicklinks";

type Fields = { name: string; jwt: string; isTestToken: boolean };

function SavedTestTokens() {
  const {
    data: entries,
    error,
    isLoading,
    revalidate,
  } = usePromise(listQuicklinkTokens, [], {
    onError: () => undefined,
  });

  return (
    <List navigationTitle="Saved Test Tokens" isLoading={isLoading} searchBarPlaceholder="Search Saved Test Tokens">
      {error ? (
        <List.EmptyView
          title="Could Not Load Test Tokens"
          description="Retry to read the test tokens saved on this device."
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading && <List.EmptyView title="No Saved Test Tokens" />
      )}
      {entries?.map(({ name, link, savedJwtId }) => (
        <List.Item
          key={savedJwtId}
          title={name}
          actions={
            <ActionPanel>
              <Action.CreateQuicklink quicklink={{ name, link }} />
              <Action
                icon={Icon.Trash}
                title="Forget Saved Test Token"
                style={Action.Style.Destructive}
                onAction={async () => {
                  try {
                    if (await forgetQuicklinkToken(savedJwtId)) revalidate();
                  } catch (error) {
                    await showFailureToast(error, {
                      title: "Could Not Forget the Test Token",
                      message: "Try again to remove the saved value.",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function QuicklinkPreview({ name, savedJwtId, link }: { name: string; savedJwtId: string; link: string }) {
  const { pop } = useNavigation();
  return (
    <Detail
      navigationTitle="Save JWT Quicklink"
      markdown="Save this quicklink to open the decoded test token on this device."
      actions={
        <ActionPanel>
          <Action.CreateQuicklink quicklink={{ name, link }} />
          <Action
            title="Discard Saved Test Token"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              try {
                if (await forgetQuicklinkToken(savedJwtId)) pop();
              } catch (error) {
                await showFailureToast(error, {
                  title: "Could Not Discard the Test Token",
                  message: "Try again to remove the saved value.",
                });
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const { handleSubmit, itemProps } = useForm<Fields>({
    initialValues: { name: "", jwt: "", isTestToken: false },
    validation: {
      name: (value) => (value?.trim() ? undefined : "Enter a name for the quicklink."),
      jwt: (value) => {
        const token = value?.trim() ?? "";
        if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token)) return "Enter a valid three-part JWT.";
        try {
          decodeJwtWithItems(token, undefined);
        } catch {
          return "Enter a valid three-part JWT.";
        }
      },
      isTestToken: (value) => (value ? undefined : "Confirm that the JWT is safe test data."),
    },
    async onSubmit({ name, jwt }) {
      if (saving.current) return;
      saving.current = true;
      setIsSaving(true);
      try {
        const label = name.trim();
        const saved = await saveQuicklinkToken(label, jwt.trim());
        push(<QuicklinkPreview name={label} {...saved} />);
      } catch (error) {
        await showFailureToast(error, {
          title: "Could Not Save the Test Token",
          message: "Try again to save the test token on this device.",
        });
      } finally {
        saving.current = false;
        setIsSaving(false);
      }
    },
  });

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={handleSubmit} />
          <Action.Push title="Manage Saved Test Tokens" icon={Icon.List} target={<SavedTestTokens />} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Quicklink Name" placeholder="Example API Token" {...itemProps.name} />
      <Form.PasswordField title="Test JWT" placeholder="Paste a test JWT" {...itemProps.jwt} />
      <Form.Checkbox label="This token contains no real credentials or personal data" {...itemProps.isTestToken} />
      <Form.Description text="The test token is saved in Raycast’s local extension storage. The quicklink contains only a reference to it." />
    </Form>
  );
}
