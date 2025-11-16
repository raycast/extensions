import { List, Icon, ActionPanel } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Redis } from "@upstash/redis";
import { useState } from "react";
import { RedisDatabase } from "../redis";
import { OpenInUpstash } from "../upstash";

type RedisValueType = string | number | boolean | null | undefined | object | Array<RedisValueType>;
function formatValue(value: RedisValueType) {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > 40 ? str.substring(0, 40) + "…" : str;
}
export default function DataBrowser({ database }: { database: RedisDatabase }) {
  const [prefix, setPrefix] = useState("");
  const redis = new Redis({
    url: `https://${database.endpoint}`,
    token: database.password,
  });

  const {
    isLoading,
    data: items,
    pagination,
  } = useCachedPromise(
    (match: string) => async (options) => {
      const cursor = options.cursor || 0;

      const [next, keys] = await redis.scan(cursor, {
        match: match || "*",
        count: 100,
      });

      if (!keys.length) return { data: [], hasMore: false, cursor: 0 };
      // Pipeline TYPE calls
      const typePipe = redis.pipeline();
      for (const key of keys) {
        typePipe.type(key);
      }
      const types: string[] = await typePipe.exec();

      // Pipeline value calls
      const valuePipe = redis.pipeline();
      keys.forEach((key, index) => {
        const t = types[index];
        switch (t) {
          case "string":
            valuePipe.get(key);
            break;
          case "hash":
            valuePipe.hgetall(key);
            break;
          case "list":
            valuePipe.lrange(key, 0, -1);
            break;
          case "set":
            valuePipe.smembers(key);
            break;
          case "zset":
            valuePipe.zrange(key, 0, -1, { withScores: true });
            break;
          default:
            valuePipe.get(key);
        }
      });

      const values: RedisValueType[] = await valuePipe.exec();

      const result = keys.map((key, i) => ({
        key,
        type: types[i],
        value: values[i],
      }));

      return {
        data: result,
        hasMore: next !== "0",
        cursor: Number(next),
      };
    },
    [prefix],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setPrefix}>
      {items.map((item) => (
        <List.Item
          key={item.key}
          icon={Icon.Key}
          title={item.key}
          subtitle={item.type}
          accessories={[{ text: formatValue(item.value) }]}
          actions={
            <ActionPanel>
              <OpenInUpstash route={`redis/${database.database_id}/data-browser`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
