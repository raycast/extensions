import got from "got";
import { getHeaders, getRequestUrl } from "./storage";
import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, List, LocalStorage, Clipboard } from "@raycast/api";

export default function Warehouse() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setCurrentWarehouse((await LocalStorage.getItem("currentWarehouse")) as string | null);

      const data = await got
        .post(await getRequestUrl(`/wms/common_web/meta/warehouse/list_v2`), {
          json: {
            page_info: {
              page_no: 1,
              page_size: 100,
              total_count: 0,
              has_more: 0,
            },
          },
          headers: await getHeaders(),
        })
        .json<any>();

      setData(data.data.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const sortedData = data.sort((a) => {
    if (currentWarehouse === (a as any).code) {
      return -1;
    }
    return 1;
  });

  return (
    <List isLoading={isLoading}>
      {sortedData?.map((item: any) => (
        <List.Item
          key={item.id}
          title={item.name}
          accessories={currentWarehouse === item.code ? [{ text: "当前仓库" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="设置为当前仓库"
                onAction={async () => {
                  setCurrentWarehouse(item.code);
                  await LocalStorage.setItem("currentWarehouse", item.code);
                }}
              />
              <Action.Paste content={item.code} onPaste={() => Clipboard.copy(item.id).catch(console.error)} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              metadata={
                <Detail.Metadata>
                  <Detail.Metadata.Label title="仓库编码" text={item.code} />
                  <Detail.Metadata.Label title="仓库名称" text={item.name} />
                </Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
