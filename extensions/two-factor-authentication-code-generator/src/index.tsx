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
} from "@raycast/api";
import { useEffect, useState } from "react";
import { decode } from "hi-base32";
import { Algorithm, Digits, generateTOTP, isValidAlgorithm, isValidDigit, Options } from "./util/totp";
import { URL } from "url";

const DEFAULT_OPTIONS: Options = {
  digits: 6,
  algorithm: "SHA1",
  period: 30,
};

export default function AppsView() {
  const [apps, setApps] = useState<
    {
      name: string;
      key: string;
      code: string;
      percent: number;
      time: string;
    }[]
  >([]);
  const { defaultAction } = getPreferenceValues();

  async function updateApps() {
    const _apps = await LocalStorage.allItems();
    setApps(
      Object.keys(_apps)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => {
          const token: { secret: string; options: Options } = parse(_apps[name]);
          return {
            name,
            key: _apps[name].toString(),
            time: `${Math.floor(token.options.period - ((new Date().getTime() / 1000) % token.options.period))}`,
            percent:
              (Math.floor(token.options.period - ((new Date().getTime() / 1000) % token.options.period)) /
                token.options.period) *
              100,
            code: generateTOTP(token.secret, token.options).toString().padStart(token.options.digits, "0"),
          };
        })
    );
  }

  useEffect(() => {
    updateApps();
    setInterval(() => {
      updateApps();
    }, 100);
  }, []);

  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Add App"
            target={<AddForm />}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.Push
            icon={Icon.Link}
            title="Add App By URL"
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
                    <Action.CopyToClipboard content={a.code} title="Copy Code" />
                    <Action.Paste content={a.code} title="Paste Code" />
                  </>
                ) : (
                  <>
                    <Action.Paste content={a.code} title="Paste Code" />
                    <Action.CopyToClipboard content={a.code} title="Copy Code" />
                  </>
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add App"
                  target={<AddForm />}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
                <Action.Push
                  icon={Icon.Link}
                  title="Add App By URL"
                  target={<AddAppByUrlForm />}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Remove App"
                  onAction={async () => {
                    await LocalStorage.removeItem(a.name);

                    await updateApps();
                  }}
                  shortcut={{
                    modifiers: ["ctrl"],
                    key: "return",
                  }}
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

    await LocalStorage.setItem(values.name, JSON.stringify({ secret: values.secret, options: options }));

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

    try {
      const parse = new URL(url);
      if (parse.protocol != "otpauth:") {
        showToast(Toast.Style.Failure, "Unsupported protocol " + parse.protocol);
        return;
      }
      if (parse.host != "totp") {
        showToast(Toast.Style.Failure, "Unsupported type " + parse.host + " only TOTP supported");
        return;
      }

      if (!parse.pathname) {
        showToast(Toast.Style.Failure, "Label is missing");
        return;
      }

      const name = decodeURIComponent(parse.pathname.slice(1));
      const searchParams = parse.searchParams;
      const secret = searchParams.get("secret");
      const algorithm = searchParams.get("algorithm") ? searchParams.get("algorithm") : DEFAULT_OPTIONS.algorithm;
      const maybePeriod = searchParams.get("period");
      const period = maybePeriod ? parseInt(maybePeriod) : DEFAULT_OPTIONS.period;
      const digits = searchParams.get("digits") ? searchParams.get("digits") : DEFAULT_OPTIONS.digits;

      if (!secret) {
        showToast(Toast.Style.Failure, "Secret is mandatory");
        return;
      }

      try {
        decode.asBytes(secret);
      } catch {
        showToast(Toast.Style.Failure, "Invalid 2FA secret");
        return;
      }

      if (!isValidAlgorithm(algorithm)) {
        showToast(Toast.Style.Failure, "Unsupported hashing algorithm " + algorithm);
        return;
      }

      if (isNaN(period)) {
        showToast(Toast.Style.Failure, "Period should be a number");
        return;
      }

      if (+period <= 0) {
        showToast(Toast.Style.Failure, "Period should be positive number");
        return;
      }

      if (!isValidDigit(digits)) {
        showToast(Toast.Style.Failure, "Unsupported digits " + digits);
        return;
      }

      const options: Options = { digits: digits, period: period, algorithm: algorithm };

      await LocalStorage.setItem(name, JSON.stringify({ secret: secret, options: options }));

      push(<AppsView />);
    } catch (e) {
      showToast(Toast.Style.Failure, "Unable to parse URL");
      return;
    }
    push(<AppsView />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={onSubmit} />
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

function parse(value: string): { secret: string; options: Options } {
  try {
    return JSON.parse(value);
  } catch (e) {
    return { secret: value, options: DEFAULT_OPTIONS };
  }
}
