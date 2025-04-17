import { Action, ActionPanel, Clipboard, Detail, List } from "@raycast/api";
import got from "got";
import { useEffect, useState } from "react";
import { getCurrentWarehouse, getHeaders, getRequestUrl } from "./storage";

export default function fetchContainer() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await got
        .post(await getRequestUrl(`/bff/wms/dbmp/meta/container/list`), {
          json: {
            query_param: {
              warehouse_code: await getCurrentWarehouse(),
              is_virtual: false,
              use_status_list: [100],
              type_list: ["PICK_BOX"],
            },
            page_info: {
              page_no: 1,
              page_size: 20,
              total_count: 0,
              has_more: 0,
            },
          },
          headers: await getHeaders(),
        })
        .json<any>();

      setData(data?.data ?? []);
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
              <Action.Paste content={item.code} onPaste={() => Clipboard.copy(item.code).catch(console.error)} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="容器规格" text={item.container_spec_name}></Detail.Metadata.Label>
                  <Detail.Metadata.TagList title="使用状态">
                    <Detail.Metadata.TagList.Item text={item.use_status === 100 ? "空闲" : "占用"} color={"#eed535"} />
                  </Detail.Metadata.TagList>
                  <Detail.Metadata.Label title="仓库" text={item.warehouse_name} />
                </Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
