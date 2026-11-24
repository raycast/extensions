import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  LaunchProps,
  List,
  open,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  activate,
  AnyWindowItem,
  AnyWindowResponse,
  findApplication,
  missingApplicationResponse,
  showLicense,
  watchSearch,
} from "./layauto";

export default function SearchWindows(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [applicationPath, setApplicationPath] = useState<string | null>();
  const [response, setResponse] = useState<AnyWindowResponse>();
  const [isRunning, setIsRunning] = useState(true);
  const [selectedID, setSelectedID] = useState<string>();
  // Results that arrive while Deep Windows load keep the user's selection, as in LayAuto 4's own panel.
  const selection = useRef<{ query: string; id?: string }>({ query: "" });

  useEffect(() => {
    findApplication().then((path) => setApplicationPath(path ?? null));
  }, []);

  useEffect(() => {
    if (applicationPath === undefined) return;
    if (applicationPath === null) {
      setResponse(missingApplicationResponse);
      setIsRunning(false);
      return;
    }
    setIsRunning(true);
    return watchSearch(
      applicationPath,
      searchText,
      (next) => {
        const current = selection.current;
        const keepsSelection =
          current.query === searchText && !!current.id && next.items.some((item) => item.id === current.id);
        const id = keepsSelection ? current.id : (next.selectedID ?? next.items[0]?.id);
        selection.current = { query: searchText, id };
        setSelectedID(id);
        setResponse(next);
      },
      () => setIsRunning(false),
    );
  }, [applicationPath, searchText]);

  // The results stop updating once loading finishes, so returning to this list would show windows
  // that have since closed. Leave it now; the next launch searches afresh.
  const leave = () => closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  const bringToFront = async (item: AnyWindowItem) => {
    if (!applicationPath) return;
    await leave();
    const result = await activate(applicationPath, item.id);
    if (result.error) await showHUD(result.error.message);
  };

  const openLicense = async () => {
    if (!applicationPath) return;
    await leave();
    const result = await showLicense(applicationPath);
    if (result.error) await showHUD(result.error.message);
  };

  const openLayAuto = applicationPath ? (
    <ActionPanel>
      <Action title="Open LayAuto 4" icon={Icon.AppWindow} onAction={() => open(applicationPath)} />
    </ActionPanel>
  ) : (
    <ActionPanel>
      <Action.OpenInBrowser title="Get LayAuto 4" url="https://layautoapp.com" />
    </ActionPanel>
  );

  const statusRows = [
    ...(response?.loadingText ? [{ text: response.loadingText, icon: Icon.CircleProgress }] : []),
    ...(response?.failures ?? []).map((text) => ({ text, icon: Icon.Warning })),
  ];

  return (
    <List
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search windows, Deep Windows, and sessions"
      isLoading={isRunning || response?.status === "loading"}
      selectedItemId={selectedID}
      onSelectionChange={(id) => {
        if (id) selection.current = { query: searchText, id };
      }}
    >
      {response?.error ? (
        <List.EmptyView icon={Icon.Warning} title={response.error.message} actions={openLayAuto} />
      ) : response?.status === "ready" && response.items.length === 0 && statusRows.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={response.emptyText ?? "No Results"} />
      ) : null}
      {response?.items.map((item) => (
        <List.Item
          key={item.id}
          id={item.id}
          icon={item.iconPath ? { fileIcon: item.iconPath } : Icon.Window}
          title={item.title}
          subtitle={item.subtitle}
          accessories={[{ tag: item.kindLabel }]}
          actions={
            <ActionPanel>
              <Action title="Bring to Front" icon={Icon.Window} onAction={() => bringToFront(item)} />
            </ActionPanel>
          }
        />
      ))}
      {response?.upgradeText && (
        <List.Item
          id="upgrade"
          icon={Icon.LockUnlocked}
          title={response.upgradeText}
          actions={
            <ActionPanel>
              <Action title="Open License Settings" icon={Icon.Key} onAction={openLicense} />
            </ActionPanel>
          }
        />
      )}
      {statusRows.length > 0 && (
        <List.Section>
          {statusRows.map((row) => (
            <List.Item key={row.text} id={`status:${row.text}`} icon={row.icon} title={row.text} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
