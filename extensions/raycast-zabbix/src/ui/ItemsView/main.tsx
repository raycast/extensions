import * as React from "react";
import * as Types from "@ui/types";
import * as LocalStorageKey from "@ui/localstorage";
import * as Context from "./context";
import * as ContextGlobal from "@ui/context";
import { ZabbixParamsItemGet } from "@api/zabbix/types";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { LoadData } from "./function";
import { ListItems } from "./components/items";
import { List } from "@raycast/api";

export function ItemsView({
  serverUUID,
  params,
}: {
  serverUUID: string;
  params: ZabbixParamsItemGet;
}): React.JSX.Element {
  /* useState: Show Detail */
  const [ShowDetail, SetShowDetail] = React.useState(false);

  /* useLocalStorage: Zabbix Server Config */
  const { value: zabbixServer, isLoading: isLoadingZabbixServer } =
    useLocalStorage<Types.LocalStorageZabbixServer[]>(
      LocalStorageKey.LocalStorageKeyZabbixServer,
    );
  const ZabbixServer = React.useMemo(() => {
    if (!zabbixServer) return;
    return zabbixServer.find((v) => v.uuid === serverUUID);
  }, [zabbixServer, serverUUID]);
  const Params = React.useMemo(() => {
    return {
      ...params,
      output: [
        "itemid",
        "hostid",
        "name_resolved",
        "type",
        "value_type",
        "description",
        "error",
        "history",
        "lastclock",
        "lastvalue",
        "prevvalue",
        "state",
        "status",
        "units",
      ],
      selectHosts: ["hostid", "name", "description"],
      selectTriggers: ["triggerid", "priority", "status", "value"],
      sortfield: "name",
      sortorder: "DESC",
    };
  }, [params]);

  const abortable = React.useRef<AbortController>(new AbortController());
  const {
    data: Data,
    isLoading: isLoadingData,
    revalidate: RevalidateData,
  } = useCachedPromise(LoadData, [Params, ZabbixServer], {
    keepPreviousData: true,
    execute: false,
    abortable: abortable,
    failureToastOptions: {
      title: `Error Loading Zabbix Data from ${ZabbixServer?.name}`,
    },
  });

  /* Global IsLoading */
  const IsLoading = React.useMemo(() => {
    return isLoadingZabbixServer || isLoadingData;
  }, [isLoadingZabbixServer, isLoadingData]);

  /* Load Data */
  React.useEffect(() => {
    if (!IsLoading && ZabbixServer) RevalidateData();
  }, [ZabbixServer]);

  /* Context Data */
  const ctxValueShowDetail = React.useMemo(() => {
    return {
      value: ShowDetail,
      setValue: SetShowDetail,
    };
  }, [ShowDetail]);
  const ctxValueZabbixServer = React.useMemo(() => {
    return {
      value: ZabbixServer,
    };
  }, [ZabbixServer]);
  const ctxValueHandleRevalidateData = React.useMemo(() => {
    return {
      isLoading: IsLoading,
      revalidateData: async () => {
        RevalidateData();
      },
    };
  }, [RevalidateData, IsLoading]);

  return (
    <ContextGlobal.HandleRevalidateData value={ctxValueHandleRevalidateData}>
      <ContextGlobal.ShowDetail value={ctxValueShowDetail}>
        <Context.ZabbixServer value={ctxValueZabbixServer}>
          <List
            searchBarAccessory={
              <List.Dropdown tooltip="Zabbix Server">
                {ZabbixServer && (
                  <List.Dropdown.Item
                    title={ZabbixServer.name}
                    value={ZabbixServer.uuid}
                  />
                )}
              </List.Dropdown>
            }
            isShowingDetail={ShowDetail}
          >
            <ListItems data={Data} isLoading={IsLoading} />
          </List>
        </Context.ZabbixServer>
      </ContextGlobal.ShowDetail>
    </ContextGlobal.HandleRevalidateData>
  );
}
