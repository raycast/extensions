import type { App } from "./util/hooks";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  useNavigation,
  getPreferenceValues,
  LocalStorage,
  Toast,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import { decode } from "hi-base32";
import { Algorithm, Digits, Options, parse, parseOtpUrl } from "./util/totp";
import { useApps } from "./util/hooks";

export default function AppsView() {
  const { apps, updateApps } = useApps();
  const { defaultAction } = getPreferenceValues<Preferences>();

  const updateLastTimeUsed = async (a: App) => {
    const item = await LocalStorage.getItem(a.name);
    const updated = { ...parse(item as string), lastTimeUsed: new Date().getTime() };
    await LocalStorage.setItem(a.name, JSON.stringify(updated));
  };

  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Add App"
            target={<AddForm />}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <Action.Push
            icon={Icon.Link}
            title="Add App by URL"
            target={<AddAppByUrlForm />}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          />
        </ActionPanel>
      }
    >
      {apps.map((a) => (
        <List.Item
          title={a.name}
          subtitle={a.code}
          key={a.name}
          accessories={[
            {
              icon: {
                source:
                  +a.percent > 75
                    ? Icon.CircleProgress100
                    : +a.percent > 50
                      ? Icon.CircleProgress75
                      : +a.percent > 25
                        ? Icon.CircleProgress50
                        : +a.time > 0
                          ? Icon.CircleProgress25
                          : Icon.Circle,
              },
              tooltip: a.time,
            },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {defaultAction == "copy" ? (
                  <>
                    <Action.CopyToClipboard content={a.code} title="Copy Code" onCopy={() => updateLastTimeUsed(a)} />
                    <Action.Paste content={a.code} title="Paste Code" onPaste={() => updateLastTimeUsed(a)} />
                  </>
                ) : (
                  <>
                    <Action.Paste content={a.code} title="Paste Code" onPaste={() => updateLastTimeUsed(a)} />
                    <Action.CopyToClipboard content={a.code} title="Copy Code" onCopy={() => updateLastTimeUsed(a)} />
                  </>
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add App"
                  target={<AddForm />}
                  shortcut={{ modifiers: ["cmd"], key: "g" }}
                />
                <Action.Push
                  icon={Icon.Link}
                  title="Add App by URL"
                  target={<AddAppByUrlForm />}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Remove App"
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Remove App?",
                        message: "Your key will be lost forever, unless you've performed a backup.",
                        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                      })
                    ) {
                      await LocalStorage.removeItem(a.name);
                      await updateApps();
                    }
                  }}
                  shortcut={{
                    modifiers: ["ctrl"],
                    key: "return",
                  }}
                />
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit App"
                  target={<EditForm app={a} />}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddForm() {
  const { push } = useNavigation();

  const onSubmit = async (e: Record<string, Form.Value>) => {
    const values = e as { name?: string; secret?: string; digits: Digits; period: number; algorithm: Algorithm };

    if (!values.name || !values.secret) {
      showToast(Toast.Style.Failure, "Please provide both fields");
      return;
    }

    values.secret = values.secret.replace(/[-\s]/g, "").toUpperCase();

    if (await LocalStorage.getItem(values.name)) {
      showToast(Toast.Style.Failure, "This app name is already taken");
      return;
    }

    try {
      decode.asBytes(values.secret);
    } catch {
      showToast(Toast.Style.Failure, "Invalid 2FA secret");
      return;
    }

    if (isNaN(values.period)) {
      showToast(Toast.Style.Failure, "Period should be a number");
      return;
    }

    if (+values.period <= 0) {
      showToast(Toast.Style.Failure, "Period should be positive number");
      return;
    }

    const options: Options = { digits: values.digits, period: values.period, algorithm: values.algorithm };

    await LocalStorage.setItem(
      values.name,
      JSON.stringify({ secret: values.secret, options: options, lastTimeUsed: new Date().getTime() }),
    );

    push(<AppsView />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="App Name" placeholder="e.g. GitHub" />
      <Form.TextField id="secret" title="2FA Secret" placeholder="Get this from your provider" />
      <Form.TextField
        id="period"
        title="Period"
        placeholder="A period that a TOTP code will be valid for"
        defaultValue="30"
      />
      <Form.Dropdown id="digits" title="Digits count" defaultValue="6">
        <Form.Dropdown.Item title="6" value="6" />
        <Form.Dropdown.Item title="7" value="7" />
        <Form.Dropdown.Item title="8" value="8" />
      </Form.Dropdown>
      <Form.Dropdown id="algorithm" title="Algorithm" defaultValue="SHA1">
        <Form.Dropdown.Item title="SHA1" value="SHA1" />
        <Form.Dropdown.Item title="SHA256" value="SHA256" />
        <Form.Dropdown.Item title="SHA512" value="SHA512" />
      </Form.Dropdown>
    </Form>
  );
}

function AddAppByUrlForm() {
  const { push } = useNavigation();

  const onSubmit = async (e: Record<string, Form.Value>) => {
    const { url } = e as { url?: string };

    if (!url) {
      showToast(Toast.Style.Failure, "Please provide both fields");
      return;
    }

    const parse = parseOtpUrl(url);

    if (!parse.success) {
      showToast(Toast.Style.Failure, parse.data);
      return;
    }

    await LocalStorage.setItem(parse.data.name, JSON.stringify(parse.data.data));

    push(<AppsView />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="url"
        title="Otpauth URL"
        placeholder="e.g. otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"
      />
    </Form>
  );
}

function EditForm({ app }: { app: App }) {
  const { pop } = useNavigation();
  const onSubmit = async (e: { name?: string }) => {
    const { name } = e;

    if (!name) {
      showToast(Toast.Style.Failure, "Please provide name");
      return;
    }

    if (await LocalStorage.getItem(name)) {
      showToast(Toast.Style.Failure, "This app name is already taken");
      return;
    }

    const _app = await LocalStorage.getItem(app.name);
    await LocalStorage.removeItem(app.name);
    await LocalStorage.setItem(name, _app as LocalStorage.Value);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Pencil} title="Submit" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="App Name" placeholder={app.name} defaultValue={app.name} />
      <Form.Description title="⚠️" text="To prevent loss of data, please Backup your codes first" />
    </Form>
  );
}
