import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useCallback, useEffect } from "react";
import { Hub } from "../lib/hub/hub";
import { AccessToken } from "../lib/hub/types";
import { initHub } from "./SearchRepository";

const scopeDesc: { [key: string]: string } = {
  "repo:admin": "Read, Write, Delete",
  "repo:write": "Read & Write",
  "repo:read": "Read-only",
  "repo:public_read": "Public Repo Read-only",
};

export default function SearchAccessTokens() {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hubState, setHub] = useState<Hub>();
  const [searchText, setSearchText] = useState<string>("");

  const search = useCallback(
    (text: string) => {
      const abortCtrl = new AbortController();
      const fn = async () => {
        try {
          setLoading(true);
          const hub = await initHub();
          if (!hub) {
            return;
          }
          setHub(hub);
          let result: AccessToken[] = [];
          let params: any = { page: 1, page_size: 100 };
          for (;;) {
            const resp = await hub.listAccessTokens(params, abortCtrl.signal);
            result.push(...resp.results);
            if (!resp.next) break;
            const url = new URL(resp.next);
            params = url.searchParams;
          }
          result = result.filter((token) => token.token_label.toLowerCase().includes(text.toLowerCase()));
          setTokens(result);
          setSearchText(text);
        } finally {
          setLoading(false);
        }
      };
      fn();
      return () => abortCtrl.abort();
    },
    [setLoading, setTokens],
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={loading} throttle onSearchTextChange={search}>
      <List.EmptyView
        actions={
          <ActionPanel>
            <Action.Push title="New Access Token" target={<CreateAccessToken hub={hubState} />} />
          </ActionPanel>
        }
      />
      <List.Section title="Results" subtitle={tokens.length + ""}>
        {tokens.map((token) => (
          <List.Item
            icon={{
              value: token.is_active ? Icon.Checkmark : Icon.XMarkCircle,
              tooltip: token.is_active ? "Active" : "Inactive",
            }}
            key={token.uuid}
            title={token.token_label}
            subtitle={token.last_used ? `Last used at ${token.last_used}` : "Never used"}
            accessories={token.scopes.map((scope) => ({ text: scopeDesc[scope] }))}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Pencil}
                  title="Edit"
                  target={<UpdateAccessToken hub={hubState} token={token} />}
                />
                <Action.Push icon={Icon.Plus} title="New Access Token" target={<CreateAccessToken hub={hubState} />} />
                <Action.SubmitForm
                  icon={Icon.ArrowClockwise}
                  title="Refresh"
                  onSubmit={() => {
                    search(searchText);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.SubmitForm
                  icon={Icon.Trash}
                  title="Delete"
                  onSubmit={async () => {
                    const options: Alert.Options = {
                      title: "Delete Access Token",
                      message: "You will not be able to recover it",
                      primaryAction: {
                        title: "Delete Access Token",
                        onAction: async () => {
                          await showToast({
                            style: Toast.Style.Animated,
                            title: "Deleting Access Token",
                          });
                          try {
                            await hubState?.deleteAccessToken(token.uuid);
                            showToast({
                              style: Toast.Style.Success,
                              title: "Access Token Deleted",
                            });
                            search(searchText);
                          } catch (err) {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to delete access token",
                              message: `${err}`,
                            });
                          }
                        },
                      },
                    };
                    await confirmAlert(options);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CreateAccessToken(props: { hub?: Hub }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              if (!props.hub) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Invalid hub instance",
                });
                return;
              }

              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Creating Access Token",
              });
              try {
                if (!values.token_label) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Access Token Description can't be empty",
                  });
                  return;
                }
                const token = await props.hub.createAccessToken({
                  token_label: values.token_label,
                  scopes: [values.scopes],
                });
                toast.hide();
                await Clipboard.copy(token.token);
                showHUD("Access Token Created");
              } catch (err) {
                showToast(Toast.Style.Failure, "Failed to create access token", `${err}`);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="token_label" title="Access Token Description" />
      <Form.Dropdown id="scopes" title="Access permissions" defaultValue="repo:admin">
        <Form.Dropdown.Item value="repo:admin" title={scopeDesc["repo:admin"]} />
        <Form.Dropdown.Item value="repo:write" title={scopeDesc["repo:write"]} />
        <Form.Dropdown.Item value="repo:read" title={scopeDesc["repo:read"]} />
        <Form.Dropdown.Item value="repo:public_read" title={scopeDesc["repo:public_read"]} />
      </Form.Dropdown>
    </Form>
  );
}

function UpdateAccessToken(props: { hub?: Hub; token: AccessToken }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              if (!props.hub) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Invalid hub instance",
                });
                return;
              }

              await showToast({
                style: Toast.Style.Animated,
                title: "Updating Access Token",
              });
              try {
                if (!values.token_label) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Access Token Description can't be empty",
                  });
                  return;
                }
                await props.hub.updateAccessToken(props.token.uuid, {
                  token_label: values.token_label,
                  is_active: values.is_active,
                });
                showToast({
                  style: Toast.Style.Success,
                  title: "Access Token Updated",
                });
              } catch (err) {
                showToast(Toast.Style.Failure, "Failed to create access token", `${err}`);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="token_label" title="Access Token Description" defaultValue={props.token.token_label} />
      <Form.Checkbox id="is_active" label="Active" defaultValue={props.token.is_active} />
    </Form>
  );
}
