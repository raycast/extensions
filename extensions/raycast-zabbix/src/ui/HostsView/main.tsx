import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import * as LocalStorageKey from "@ui/localstorage";
import { LoadData } from "./function";
import { List, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { ServerForm } from "@ui/ServerForm/main";
import { SearchBarAccessory } from "@ui/components/searchbar";
import { ZabbixParamsHostGet } from "@api/zabbix/types";
import { ListItems } from "./components/items";

export function HostsView(): React.JSX.Element {
  /* Raycast */
  const { push } = useNavigation();

  /* useState: Show Detail */
  const [ShowDetail, SetShowDetail] = React.useState(false);

  /* useLocalStorage: Zabbix Server Config */
  const {
    value: ZabbixServer,
    setValue: SetZabbixServer,
    isLoading: IsLoadingZabbixServer,
  } = useLocalStorage<Types.LocalStorageZabbixServer[]>(
    LocalStorageKey.LocalStorageKeyZabbixServer,
  );

  /* useLocalStorage: Selected Server */
  const {
    value: SelectedZabbixServer,
    isLoading: IsLoadingSelectedZabbixServer,
    setValue: SetSelectedZabbixServer,
  } = useLocalStorage<string>("problems_selected_server");

  /* useState: Data */
  const [Data, SetData] = React.useState<Types.DataHostsView[]>();
  const [IsLoadingData, SetIsLoadingData] = React.useState<boolean>(false);

  /* useMemo: Loading State All */
  const IsLoading = React.useMemo(() => {
    return (
      IsLoadingZabbixServer || IsLoadingSelectedZabbixServer || IsLoadingData
    );
  }, [IsLoadingZabbixServer, IsLoadingSelectedZabbixServer, IsLoadingData]);

  /* useCallback: Revalidate Data Function */
  const handleRevalidateData = React.useCallback(async (): Promise<void> => {
    /* Exit on undefined values */
    if (!ZabbixServer?.length || !SelectedZabbixServer) return;

    /* Set Loading True */
    SetIsLoadingData(true);

    /* Clear Data  */
    SetData(undefined);

    /* Set Params */
    const params = {
      output: [
        "hostid",
        "name",
        "description",
        "status",
        "flags",
        "maintenance_status",
      ],
      selectHostGroups: ["groupid", "name"],
      selectInterfaces: [
        "interfaceid",
        "type",
        "ip",
        "dns",
        "port",
        "useip",
        "available",
        "error",
        "error_from",
        "disable_until",
      ],
      selectTriggers: ["status", "value", "priority", "description"],
      selectTags: "extend",
      sortfield: "name",
      sortorder: "ASC",
    } as ZabbixParamsHostGet;

    /* Load Data */
    await LoadData(ZabbixServer, SelectedZabbixServer, params, SetData);

    /* Set Loading True */
    SetIsLoadingData(false);
  }, [ZabbixServer, SelectedZabbixServer]);

  /* If Zabbix Server is not configured Push <ServerForm/> */
  React.useEffect(() => {
    if (!IsLoadingZabbixServer && !ZabbixServer?.length)
      push(
        <ServerForm
          ZabbixServer={ZabbixServer}
          SetZabbixServer={SetZabbixServer}
          setSelectedServer={SetSelectedZabbixServer}
        />,
      );
  }, [ZabbixServer, IsLoadingZabbixServer]);

  /* Revalidate Data on SelectedZabbixServer Change */
  React.useEffect(() => {
    if (!IsLoading && SelectedZabbixServer) handleRevalidateData();
  }, [SelectedZabbixServer]);

  /* searchBarAccessory */
  const searchBarAccessory = React.useMemo(() => {
    return (
      <SearchBarAccessory
        ZabbixServer={ZabbixServer}
        isLoading={IsLoading}
        SelectedZabbixServer={SelectedZabbixServer}
        SetSelectedZabbixServer={SetSelectedZabbixServer}
      />
    );
  }, [ZabbixServer, IsLoading, SelectedZabbixServer, SetSelectedZabbixServer]);

  /* Context Data */
  const ctxValueShowDetail = React.useMemo(() => {
    return {
      value: ShowDetail,
      setValue: SetShowDetail,
    };
  }, [ShowDetail]);
  const ctxValueHandleRevalidateData = React.useMemo(() => {
    return {
      isLoading: IsLoading,
      revalidateData: handleRevalidateData,
    };
  }, [IsLoading, handleRevalidateData]);
  const ctxValueSelectedServer = React.useMemo(() => {
    return {
      value: SelectedZabbixServer,
      isLoading: IsLoadingSelectedZabbixServer,
      setValue: SetSelectedZabbixServer,
    };
  }, [
    SelectedZabbixServer,
    IsLoadingSelectedZabbixServer,
    SetSelectedZabbixServer,
  ]);

  return (
    <ContextGlobal.ShowDetail value={ctxValueShowDetail}>
      <ContextGlobal.HandleRevalidateData value={ctxValueHandleRevalidateData}>
        <ContextGlobal.SelectedServer value={ctxValueSelectedServer}>
          <List
            isLoading={IsLoading}
            searchBarAccessory={searchBarAccessory}
            isShowingDetail={ShowDetail}
          >
            <ListItems
              isLoading={IsLoading}
              zabbixServer={ZabbixServer}
              setZabbixServer={SetZabbixServer}
              selectedZabbixServer={SelectedZabbixServer}
              data={Data}
            />
          </List>
        </ContextGlobal.SelectedServer>
      </ContextGlobal.HandleRevalidateData>
    </ContextGlobal.ShowDetail>
  );
}
