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
  useNavigation
} from "@raycast/api";
import { useEffect, useState } from "react";

import { decode } from "hi-base32";

import { Algorithm, Digits, generateTOTP, Options } from "./util/totp";
import { URL } from "url";

const DEFAULT_OPTIONS: Options = {
  digits: 6,
  algorithm: "SHA1",
  period: 30
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
        Object.keys(_apps).map((name) => {
          const token: { secret: string, options: Options } = parse(_apps[name]);
          return {
            name,
            key: _apps[name].toString(),
            code: generateTOTP(token.secret, token.options).toString().padStart(6, "0")
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
            icon={Icon.Plus}
            title="Add App"
            target={<AddFromUriForm />}
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
                  icon={Icon.Plus}
                  title="Add App"
                  target={<AddFromUriForm />}
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
                        Object.keys(_apps).map((name) => {
                          const token = parse(_apps[name]);
                          return {
                            name,
                            key: _apps[name].toString(),
                            code: generateTOTP(token.secret, token.options).toString().padStart(6, "0")
                          };
                        })
                      );
                    });
                  }}
                  shortcut={{
                    modifiers: ["ctrl"],
                    key: "enter"
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
    const values = e as { name?: string; secret?: string, digits: Digits, period: number, algorithm: Algorithm };

    const options: Options = { digits: values.digits, period: values.period, algorithm: values.algorithm };

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

    await setLocalStorageItem(values.name, JSON.stringify({ secret: values.secret, options: options }));

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
      <Form.TextField id="name" title="App Name" placeholder="e.g. GitHub" />
      <Form.TextField id="secret" title="2FA Secret" placeholder="Get this from your provider" />
      <Form.TextField id="period" title="Period" placeholder="A period that a TOTP code will be valid for"
                      defaultValue="30" />
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

function AddFromUriForm() {
  const { push } = useNavigation();

  const onSubmit = async (e: Record<string, FormValue>) => {
    const values = e as { uri?: string };

    if (!values.uri) {
      await showToast(ToastStyle.Failure, "Please provide URI");
      return;
    }

    try {
      const uri = new URL(values.uri);
      if (uri.protocol != "otpauth:") {
        await showToast(ToastStyle.Failure, `Unsupported protocol ${uri.protocol}`);
        return;
      }

      if (uri.host != "totp") {
        await showToast(ToastStyle.Failure, `Only TOTP tokens supports`);
        return;
      }
      const params = uri.searchParams;
      const issuer = params.get("issuer");
      let secret = params.get("secret");
      const digits = params.get("digits");
      const period = params.get("period");
      const algorithm = params.get("algorithm");
      if (!issuer || !secret) {
        await showToast(ToastStyle.Failure, "Issuer and Secret are required parameters");
        return;
      }
      if (await getLocalStorageItem(issuer)) {
        await showToast(ToastStyle.Failure, "This app name is already taken");
        return;
      }

      secret = secret.replace(/[-\s]/g, "").toUpperCase();

      try {
        decode.asBytes(secret);
      } catch {
        await showToast(ToastStyle.Failure, "Invalid 2FA secret");
        return;
      }

      await setLocalStorageItem(issuer, JSON.stringify({
        secret: secret, options: {
          digits: digits ? digits : DEFAULT_OPTIONS.digits,
          period: period ? period : DEFAULT_OPTIONS.period,
          algorithm: algorithm ? algorithm : DEFAULT_OPTIONS.algorithm
        }
      }));

    } catch (e) {
      await showToast(ToastStyle.Failure, "Error while parsing URI");
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
      <Form.TextField id="uri" title="URI" placeholder="URI to add token" />
    </Form>
  );
}

function parse(value: string): { secret: string, options: Options } {
  try {
    return JSON.parse(value);
  } catch (e) {
    return { secret: value, options: DEFAULT_OPTIONS };
  }
}