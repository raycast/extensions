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

import { generateTOTP } from "./util/totp";

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
          return {
            name,
            key: _apps[name].toString(),
            code: generateTOTP(_apps[name].toString()).toString().padStart(6, "0"),
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
                          return {
                            name,
                            key: _apps[name].toString(),
                            code: generateTOTP(_apps[name].toString()).toString().padStart(6, "0"),
                          };
                        })
                      );
                    });
                  }}
                  shortcut={{
                    modifiers: ["ctrl"],
                    key: "enter",
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
    const values = e as { name?: string; secret?: string };

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

    await setLocalStorageItem(values.name, values.secret);

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
    </Form>
  );
}
