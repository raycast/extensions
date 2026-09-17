import * as React from "react";
import * as Types from "@ui/types";
import { List } from "@raycast/api";

/* SearchBarAccessory Items */
function Items({
  zabbixServer,
  isLoading,
  selectedZabbixServer,
}: {
  zabbixServer?: Types.LocalStorageZabbixServer[];
  isLoading: boolean;
  selectedZabbixServer?: string;
}): React.JSX.Element | undefined {
  if (!zabbixServer?.length) return;

  const showItemAll = React.useMemo(() => {
    if (selectedZabbixServer && selectedZabbixServer.toLowerCase() === "all")
      return true;
    if (isLoading) return false;
    return zabbixServer.length > 1;
  }, [isLoading, zabbixServer, selectedZabbixServer]);

  /* If Loading show only selected server */
  const server = React.useMemo(() => {
    if (!isLoading) return zabbixServer;
    const s = zabbixServer.find((v) => v.uuid === selectedZabbixServer);
    return s ? [s] : undefined;
  }, [zabbixServer, isLoading]);

  return (
    <React.Fragment>
      {showItemAll && <List.Dropdown.Item title="All" value="all" key="all" />}
      {server &&
        server.map((v) => (
          <List.Dropdown.Item title={v.name} value={v.uuid} key={v.uuid} />
        ))}
    </React.Fragment>
  );
}

/* SearchBarAccessory */
export function SearchBarAccessory({
  ZabbixServer,
  isLoading,
  SelectedZabbixServer,
  SetSelectedZabbixServer,
}: {
  ZabbixServer?: Types.LocalStorageZabbixServer[];
  isLoading: boolean;
  SelectedZabbixServer?: string;
  SetSelectedZabbixServer: (value: string) => Promise<void>;
}): React.JSX.Element | undefined {
  if (!ZabbixServer?.length) return undefined;

  const firstRun = React.useRef(true);

  const onChange = React.useCallback(
    async (value: string) => {
      /* Exit if on  empty value */
      if (value === "") return;

      /* Exist on first run */
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }

      /* Change Value */
      if (value !== SelectedZabbixServer) SetSelectedZabbixServer(value);
    },
    [SelectedZabbixServer, firstRun],
  );

  return (
    <List.Dropdown
      tooltip="Zabbix Server"
      value={SelectedZabbixServer}
      onChange={onChange}
    >
      <Items
        zabbixServer={ZabbixServer}
        isLoading={isLoading}
        selectedZabbixServer={SelectedZabbixServer}
      />
    </List.Dropdown>
  );
}
