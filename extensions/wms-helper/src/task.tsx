import { Action, ActionPanel, Clipboard, Detail, List } from "@raycast/api";
import got from "got";
import { useEffect, useState } from "react";
import { getCurrentWarehouse, getHeaders, getRequestUrl } from "./storage";

export default function fetchTask() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await got
        .post(await getRequestUrl(`/wms/tob_web/outbound/pick/list_item`), {
          json: {
            queryParam: {
              srcOrderTypes: ["OB_ORDER_TYPE_RETURN_BACK_TO_SUPPLIER"],
              warehouseCode: await getCurrentWarehouse(),
              taskItemStatus: ["66290200"],
            },
            pageInfo: {
              pageNo: 1,
              pageSize: 20,
            },
          },
          headers: await getHeaders(),
        })
        .json<any>();

      setData(data.tasks);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <List isShowingDetail isLoading={isLoading}>
      {data.map((item: any) => (
        <List.Item
          key={item.id}
          title={item.code}
          actions={
            <ActionPanel>
              <Action.Paste
                content={item.locationCode}
                onPaste={() => Clipboard.copy(item.locationCode).catch(console.error)}
              />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="货主" text={item.ownerCode}></Detail.Metadata.Label>
                  <Detail.Metadata.Label title="库位号" text={item.locationCode} />
                </Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
