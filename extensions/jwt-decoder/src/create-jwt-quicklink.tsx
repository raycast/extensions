import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { decodeJwtWithItems } from "./utils/decode-jwt";
import { forgetQuicklinkToken, listQuicklinkTokens, saveQuicklinkToken } from "./utils/jwt-quicklinks";

type Fields = { name: string; jwt: string; isTestToken: boolean };

function SavedTestTokens() {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof listQuicklinkTokens>>>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void listQuicklinkTokens().then(
      (items) => {
        if (active) setEntries(items);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <List navigationTitle="Saved Test Tokens" isLoading={!entries && !failed}>
      <List.EmptyView title={failed ? "Could Not Load Test Tokens" : "No Saved Test Tokens"} />
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
                  if (
                    !(await confirmAlert({
                      title: "Forget Saved Test Token?",
                      message: "Any quicklinks for this token will stop working.",
                      primaryAction: { title: "Forget", style: Alert.ActionStyle.Destructive },
                    }))
                  )
                    return;
                  try {
                    await forgetQuicklinkToken(savedJwtId);
                    setEntries((current) => current?.filter((entry) => entry.savedJwtId !== savedJwtId));
                  } catch {
                    await showToast({ style: Toast.Style.Failure, title: "Could Not Forget the Test Token" });
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
            onAction={async () => {
              try {
                await forgetQuicklinkToken(savedJwtId);
                pop();
              } catch {
                await showToast({ style: Toast.Style.Failure, title: "Could Not Discard the Test Token" });
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
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function submit(values: Fields) {
    if (isSaving) return;

    const name = values.name.trim();
    const token = values.jwt.trim();
    const nextErrors: typeof errors = {};
    if (!name) nextErrors.name = "Enter a name for the quicklink.";
    if (!values.isTestToken) nextErrors.isTestToken = "Confirm that the JWT is safe test data.";
    try {
      if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token)) throw new Error();
      decodeJwtWithItems(token, undefined);
    } catch {
      nextErrors.jwt = "Enter a valid three-part JWT.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    try {
      const saved = await saveQuicklinkToken(name, token);
      push(<QuicklinkPreview name={name} {...saved} />);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Save the Test Token" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Continue" onSubmit={submit} />
          <Action.Push title="Manage Saved Test Tokens" icon={Icon.List} target={<SavedTestTokens />} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Quicklink Name"
        placeholder="Example API Token"
        error={errors.name}
        onChange={() => setErrors((previous) => ({ ...previous, name: undefined }))}
      />
      <Form.PasswordField
        id="jwt"
        title="Test JWT"
        placeholder="Paste a test JWT"
        error={errors.jwt}
        onChange={() => setErrors((previous) => ({ ...previous, jwt: undefined }))}
      />
      <Form.Checkbox
        id="isTestToken"
        label="This token contains no real credentials or personal data"
        error={errors.isTestToken}
        onChange={() => setErrors((previous) => ({ ...previous, isTestToken: undefined }))}
      />
      <Form.Description text="The test token is saved in Raycast’s local extension storage. The quicklink contains only a reference to it." />
    </Form>
  );
}
