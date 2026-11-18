import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import * as Context from "@ui/ProblemsView/context";
import * as LocalStorageKey from "@ui/localstorage";
import { Icon, List } from "@raycast/api";
import { ActionMenu } from "./menu";
import { ItemAccessory } from "./accessory";
import { useLocalStorage } from "@raycast/utils";
import { DetailProblems } from "./detail";

/* List.Item Array */
export function ListItems({
  isLoading,
  zabbixServer,
  setZabbixServer,
  selectedZabbixServer,
  data,
}: {
  isLoading: boolean;
  zabbixServer?: Types.LocalStorageZabbixServer[];
  setZabbixServer?: (value: Types.LocalStorageZabbixServer[]) => Promise<void>;
  selectedZabbixServer?: string;
  data?: Types.DataProblemsView[];
}): React.JSX.Element | undefined {
  /* context */
  const ctxShowDetail = React.useContext(ContextGlobal.ShowDetail);

  const LocalStorageKeyShowAck = React.useMemo(() => {
    if (!selectedZabbixServer) return "05b41769-525a-42c1-a8d9-6c247a56cace";
    return LocalStorageKey.KeyProblemsShowAck(selectedZabbixServer);
  }, [selectedZabbixServer]);

  /* useLocalStorage: Show Acknowledge Problems */
  const {
    value: ShowAck,
    setValue: SetShowAck,
    isLoading: IsLoadingShowAck,
  } = useLocalStorage<boolean>(LocalStorageKeyShowAck, true);

  const filteredData = React.useMemo(() => {
    /* Return unfiltered Data */
    if (!data || ShowAck) return data;

    /* Filter Data */
    let output;

    /* Remove Acknowledged Problems */
    if (!ShowAck)
      output = data.filter((v) => v.lastEvent?.acknowledged === "0");

    return output;
  }, [data, ShowAck]);

  /* Context Value */
  const contextValueDataFilterOptions = React.useMemo(() => {
    return {
      value: ShowAck,
      isLoading: IsLoadingShowAck,
      setValue: SetShowAck,
    };
  }, [ShowAck, SetShowAck, IsLoadingShowAck]);

  function getKeywords(value: Types.DataProblemsView): string[] {
    const k: string[] = [];

    /* Push Tags */
    if (value.event_get_result?.tags?.length) {
      k.push(...value.event_get_result.tags.map((v) => `${v.tag}: ${v.value}`));
    }

    return k;
  }

  /* Return List.Item */
  if (filteredData && filteredData.length)
    return (
      <Context.DataFilterOptionsShowAck value={contextValueDataFilterOptions}>
        {filteredData.map((item) => (
          <List.Item
            title={item.hosts?.at(0)?.name ?? ""}
            subtitle={item.lastEvent?.name ?? ""}
            id={`${item.server_uuid}:${item.triggerid}`}
            key={`${item.server_uuid}:${item.triggerid}`}
            keywords={getKeywords(item)}
            accessories={
              ctxShowDetail.value
                ? undefined
                : ItemAccessory(item, selectedZabbixServer)
            }
            detail={<DetailProblems value={item} />}
            actions={
              <ActionMenu
                isLoading={isLoading}
                setZabbixServer={setZabbixServer}
                zabbixServer={zabbixServer}
                value={item}
              />
            }
          />
        ))}
      </Context.DataFilterOptionsShowAck>
    );

  /* EmptyView with no Problems */
  if (!isLoading && filteredData && filteredData.length === 0)
    return (
      <Context.DataFilterOptionsShowAck value={contextValueDataFilterOptions}>
        <List.EmptyView
          icon={Icon.ThumbsUpFilled}
          title="Current Problems: 0"
          description="Enjoy the peace and quiet while it lasts! 🤫"
          actions={
            <ActionMenu
              isLoading={isLoading}
              setZabbixServer={setZabbixServer}
              zabbixServer={zabbixServer}
            />
          }
        />
      </Context.DataFilterOptionsShowAck>
    );

  /* EmptyView with Loading Message */
  return (
    <List.EmptyView
      icon={Icon.CircleProgress}
      title="Loading Data..."
      actions={<ActionMenu isLoading={isLoading} />}
    />
  );
}
