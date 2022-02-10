import {
  ActionPanel,
  AlertOptions,
  allLocalStorageItems,
  clearLocalStorage,
  Color,
  confirmAlert,
  Form,
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
import { getCurrentBackend, setCurrentBackend } from "../utils";
import { BackendsT } from "./types";

async function getBackends(): Promise<BackendsT> {
  const items: BackendsT = await allLocalStorageItems();
  return items;
}

async function addBackend(url: string, secret: string) {
  await setLocalStorageItem(url, secret);
}

async function removeBackend(url: string) {
  await removeLocalStorageItem(url);
}

export default function Backends(): JSX.Element {
  const [refreshKey, setRefreshKey] = useState(0);
  const { pop: popNavigation } = useNavigation();
  const [backends, setBackends] = useState({} as BackendsT);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const currentBackend = await getCurrentBackend();
      if (currentBackend) {
        setCurrent(currentBackend);
      }
      const items = await getBackends();
      setBackends(items);
    };
    fetchData();
  }, [refreshKey]);

  const backendList = Object.entries(backends)
    .filter(([key]) => key != "current")
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <List>
      {backendList.map(([key, value], index) => (
        <List.Item
          title={key}
          icon={{ source: Icon.Circle, tintColor: key == current ? Color.Green : Color.PrimaryText }}
          key={index}
          subtitle={value && value.length != 0 ? value : "(no secret)"}
          accessoryTitle={key == current ? "Current" : ""}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Use Backend"
                onAction={async () => {
                  await setCurrentBackend(key);
                  setCurrent(key);
                }}
              />
              <ActionPanel.Item
                title="Remove"
                onAction={async () => {
                  const options: AlertOptions = {
                    title: "Delete this backend?",
                    primaryAction: {
                      title: "Confirm",
                      onAction: async () => {
                        await removeBackend(key);
                        setRefreshKey((oldKey) => oldKey + 1);
                        showToast(ToastStyle.Success, "Delete Success", key);
                      },
                    },
                  };
                  await confirmAlert(options);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Add Backend"
        icon={{ source: Icon.Plus, tintColor: Color.Blue }}
        key={backendList.length}
        actions={
          <ActionPanel>
            <PushAction
              title="Add Backend"
              target={
                <Form
                  actions={
                    <ActionPanel>
                      <SubmitFormAction
                        title="Submit"
                        onSubmit={async (values: { url: string; secret: string }) => {
                          if (values.url.startsWith("http://") || values.url.startsWith("https://")) {
                            await addBackend(values.url, values.secret);
                            await setCurrentBackend(values.url);
                            setCurrent(values.url);
                            setRefreshKey((oldKey) => oldKey + 1);
                            showToast(ToastStyle.Success, "Add Success", values.url);
                            // ref: https://github.com/raycast/extensions/issues/571
                            // no problem with(@raycast/api>=1.27.0)
                            popNavigation();
                          } else {
                            await showToast(ToastStyle.Failure, "invalid url");
                          }
                        }}
                      />
                    </ActionPanel>
                  }
                >
                  <Form.TextField id="url" title="url" defaultValue="http://127.0.0.1:9090" />
                  <Form.TextField id="secret" title="secret" defaultValue="" />
                </Form>
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Delete All Data"
        icon={{ source: Icon.Trash, tintColor: Color.Red }}
        key={backendList.length + 1}
        actions={
          <ActionPanel>
            <ActionPanel.Item
              title="Remove"
              onAction={async () => {
                const options: AlertOptions = {
                  title: "Delete All Data?",
                  primaryAction: {
                    title: "Confirm",
                    onAction: async () => {
                      await clearLocalStorage();
                      setRefreshKey((oldKey) => oldKey + 1);
                      showToast(ToastStyle.Success, "Delete Success");
                    },
                  },
                };
                await confirmAlert(options);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
