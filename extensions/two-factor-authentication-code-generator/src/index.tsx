import {
  ActionPanel,
  ActionPanelItem,
  ActionPanelSection,
  allLocalStorageItems,
  CopyToClipboardAction,
  Form,
  FormValue,
  getLocalStorageItem,
  Icon,
  List,
  PushAction,
  removeLocalStorageItem,
  setLocalStorageItem,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation,
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
    }[]
  >([]);

  useEffect(() => {
    allLocalStorageItems().then((_apps) => {
      setApps(
        Object.keys(_apps)
          .sort((a, b) => a.localeCompare(b))
          .map((name) => {
            const token: { secret: string; options: Options } = parse(_apps[name]);
            return {
              name,
              key: _apps[name].toString(),
              code: generateTOTP(token.secret, token.options).toString().padStart(token.options.digits, "0"),
            };
          })
      );
    });
  }, []);

  return (
    <List
      actions={
        <ActionPanel>
          <PushAction
            icon={Icon.Plus}
            title="Add App"
            target={<AddForm />}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <PushAction
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
          actions={
            <ActionPanel>
              <ActionPanelSection>
                <CopyToClipboardAction content={a.code} title="Copy Code" />
                <PushAction
                  icon={Icon.Plus}
                  title="Add App"
                  target={<AddForm />}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
                <PushAction
                  icon={Icon.Link}
                  title="Add App By URL"
                  target={<AddAppByUrlForm />}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                />
              </ActionPanelSection>
              <ActionPanelSection>
                <ActionPanelItem
                  icon={Icon.Trash}
                  title="Remove App"
                  onAction={async () => {
                    await removeLocalStorageItem(a.name);

                    allLocalStorageItems().then((_apps) => {
                      setApps(
                        Object.keys(_apps)
                          .sort((a, b) => a.localeCompare(b))
                          .map((name) => {
                            const token = parse(_apps[name]);
                            return {
                              name,
                              key: _apps[name].toString(),
                              code: generateTOTP(token.secret, token.options)
                                .toString()
                                .padStart(token.options.digits, "0"),
                            };
                          })
                      );
                    });
                  }}
                  shortcut={{
                    modifiers: ["ctrl"],
                    key: "return",
                  }}
                />
              </ActionPanelSection>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddForm() {
  const { push } = useNavigation();

  const onSubmit = async (e: Record<string, FormValue>) => {
    const values = e as { name?: string; secret?: string; digits: Digits; period: number; algorithm: Algorithm };

    if (!values.name || !values.secret) {
      showToast(ToastStyle.Failure, "Please provide both fields");
      return;
    }

    values.secret = values.secret.replace(/[-\s]/g, "").toUpperCase();

    if (await getLocalStorageItem(values.name)) {
      showToast(ToastStyle.Failure, "This app name is already taken");
      return;
    }

    try {
      decode.asBytes(values.secret);
    } catch {
      showToast(ToastStyle.Failure, "Invalid 2FA secret");
      return;
    }

    if (isNaN(values.period)) {
      showToast(ToastStyle.Failure, "Period should be a number");
      return;
    }

    if (+values.period <= 0) {
      showToast(ToastStyle.Failure, "Period should be positive number");
      return;
    }

    const options: Options = { digits: values.digits, period: values.period, algorithm: values.algorithm };

    await setLocalStorageItem(values.name, JSON.stringify({ secret: values.secret, options: options }));

    push(<AppsView />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction icon={Icon.Plus} title="Submit" onSubmit={onSubmit} />
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

  const onSubmit = async (e: Record<string, FormValue>) => {
    const { url } = e as { url?: string };

    if (!url) {
      showToast(ToastStyle.Failure, "Please provide both fields");
      return;
    }

    try {
      const parse = new URL(url);
      if (parse.protocol != "otpauth:") {
        showToast(ToastStyle.Failure, "Unsupported protocol " + parse.protocol);
        return;
      }
      if (parse.host != "totp") {
        showToast(ToastStyle.Failure, "Unsupported type " + parse.host + " only TOTP supported");
        return;
      }

      if (!parse.pathname) {
        showToast(ToastStyle.Failure, "Label is missing");
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
        showToast(ToastStyle.Failure, "Secret is mandatory");
        return;
      }

      try {
        decode.asBytes(secret);
      } catch {
        showToast(ToastStyle.Failure, "Invalid 2FA secret");
        return;
      }

      if (!isValidAlgorithm(algorithm)) {
        showToast(ToastStyle.Failure, "Unsupported hashing algorithm " + algorithm);
        return;
      }

      if (isNaN(period)) {
        showToast(ToastStyle.Failure, "Period should be a number");
        return;
      }

      if (+period <= 0) {
        showToast(ToastStyle.Failure, "Period should be positive number");
        return;
      }

      if (!isValidDigit(digits)) {
        showToast(ToastStyle.Failure, "Unsupported digits " + digits);
        return;
      }

      const options: Options = { digits: digits, period: period, algorithm: algorithm };

      await setLocalStorageItem(name, JSON.stringify({ secret: secret, options: options }));

      push(<AppsView />);
    } catch (e) {
      showToast(ToastStyle.Failure, "Unable to parse URL");
      return;
    }
    push(<AppsView />);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit" onSubmit={onSubmit} />
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
