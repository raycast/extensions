import * as React from "react";
import * as Types from "@ui/types";
import * as LocalStorageKey from "@ui/localstorage";
import * as ContextGlobal from "@ui/context";
import * as Context from "./context";
import { List, LocalStorage, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { ZabbixParamsTriggerGet } from "@api/zabbix/types";
import { LocalStorageZabbixServer } from "@ui/types";
import { LocalStorageKeyZabbixServer } from "@ui/localstorage";
import { ServerForm } from "@ui/ServerForm/main";
import { LoadData } from "./function";
import { ListItems } from "./components/items";
import { SearchBarAccessory } from "@ui/components/searchbar";

interface props {
  server?: string;
  params?: ZabbixParamsTriggerGet;
}

export function ProblemsView(props: props): React.JSX.Element {
  /* Raycast */
  const { push } = useNavigation();

  /* useState: Show Detail */
  const [ShowDetail, SetShowDetail] = React.useState(false);

  /* useLocalStorage: Zabbix Server Config */
  const {
    value: ZabbixServer,
    setValue: SetZabbixServer,
    isLoading: IsLoadingZabbixServer,
  } = useLocalStorage<LocalStorageZabbixServer[]>(LocalStorageKeyZabbixServer);

  /* useLocalStorage: Selected Server */
  const {
    value: SelectedZabbixServer,
    isLoading: IsLoadingSelectedZabbixServer,
    setValue: SetSelectedZabbixServer,
  } = useLocalStorage<string>("problems_selected_server");

  /* useState: Data */
  const [Data, SetData] = React.useState<Types.DataProblemsView[]>();
  const [IsLoadingData, SetIsLoadingData] = React.useState<boolean>(false);

  /* useMemo: Loading State All */
  const IsLoading = React.useMemo(() => {
    return (
      IsLoadingZabbixServer || IsLoadingSelectedZabbixServer || IsLoadingData
    );
  }, [IsLoadingZabbixServer, IsLoadingSelectedZabbixServer, IsLoadingData]);

  /* useCallback: Revalidate Data Function */
  const handleRevalidateData = React.useCallback(async (): Promise<void> => {
    const server = props.server ?? SelectedZabbixServer;

    /* Exit on undefined values */
    if (!ZabbixServer?.length || !server) return;

    /* Set Loading True */
    SetIsLoadingData(true);

    /* Clear Data if SelectedServerChanges */
    if (!props.params && server !== SelectedZabbixServer) SetData(undefined);

    /* Set Params */
    const params =
      props.params ??
      ({
        output: ["triggerid"],
        monitored: true,
        only_true: true,
        min_severity: 3,
        selectItems: ["itemid", "name_resolved", "lastvalue", "units"],
        selectLastEvent: ["name", "severity", "clock", "acknowledged"],
        selectHosts: ["name", "description"],
        sortfield: "lastchange",
        sortorder: "DESC",
      } as ZabbixParamsTriggerGet);
    if (props.params) {
      /* Override User Defined Params */
      params.output = ["triggerid"];
      params.selectItems = ["itemid", "name_resolved", "lastvalue", "units"];
      params.selectLastEvent = ["name", "severity", "clock", "acknowledged"];
      params.selectHosts = ["name", "description"];
    } else {
      /* Change min_severity */
      try {
        const minSeverity = await LocalStorage.getItem<number>(
          LocalStorageKey.KeyProblemsMinSeverity(server),
        );
        if (minSeverity) params.min_severity = minSeverity;
      } catch (error) {
        console.warn(error);
      }
    }

    /* Load Data */
    await LoadData(ZabbixServer, server, params, SetData);

    /* Set Loading True */
    SetIsLoadingData(false);
  }, [props, ZabbixServer, SelectedZabbixServer]);

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

  /* Revalidate Data on SelectedZabbixServer Change
     Or when custom launchContext (props.server + props.params) is in use and Data
     is undefined */
  React.useEffect(() => {
    if (!Data && props.server && props.params) handleRevalidateData();
    if (!IsLoading && SelectedZabbixServer) handleRevalidateData();
  }, [SelectedZabbixServer, props.server, props.params]);

  /* searchBarAccessory */
  const searchBarAccessory = React.useMemo(() => {
    if (props.server) return;
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
  const ctxValueProps = React.useMemo(() => {
    return {
      server: props.server,
      params: props.params,
    };
  }, [props.server, props.params]);
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
  const ctxShowDetail = React.useMemo(() => {
    return {
      value: ShowDetail,
      setValue: SetShowDetail,
    };
  }, [ShowDetail]);

  return (
    <ContextGlobal.HandleRevalidateData value={ctxValueHandleRevalidateData}>
      <ContextGlobal.SelectedServer value={ctxValueSelectedServer}>
        <ContextGlobal.ShowDetail value={ctxShowDetail}>
          <Context.Props value={ctxValueProps}>
            <List
              isLoading={IsLoading}
              searchBarAccessory={searchBarAccessory}
              isShowingDetail={ShowDetail}
            >
              <ListItems
                isLoading={IsLoading}
                setZabbixServer={SetZabbixServer}
                zabbixServer={ZabbixServer}
                selectedZabbixServer={SelectedZabbixServer}
                data={Data}
              />
            </List>
          </Context.Props>
        </ContextGlobal.ShowDetail>
      </ContextGlobal.SelectedServer>
    </ContextGlobal.HandleRevalidateData>
  );
}
