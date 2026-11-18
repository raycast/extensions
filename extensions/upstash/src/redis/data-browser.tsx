import {
  List,
  Icon,
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  useNavigation,
  Image,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { Redis } from "@upstash/redis";
import { useState } from "react";
import { RedisDatabase } from "../redis";
import { OpenInUpstash } from "../upstash";

type RedisValueType = string | number | boolean | null | undefined | object | Array<RedisValueType>;
function formatValue(value: RedisValueType) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (value instanceof Array)
    return `|-|-|
|-|-|
${value.map((v, idx) => `| ${idx} | ${v instanceof Array ? JSON.stringify(v) : v} |`).join("\n")}`;
  return JSON.stringify(value);
}

const TYPE_ICON: Record<string, Image.ImageLike> = {
  list: { source: Icon.List, tintColor: Color.Orange },
  string: { source: Icon.QuotationMarks, tintColor: Color.Blue },
};
export default function DataBrowser({ database }: { database: RedisDatabase }) {
  const [prefix, setPrefix] = useState("");
  const {
    isLoading,
    data: items,
    pagination,
    mutate,
  } = useCachedPromise(
    (match: string, db: RedisDatabase) => async (options) => {
      const cursor = options.cursor || 0;

      const redis = new Redis({
        url: `https://${db.endpoint}`,
        token: db.password,
      });
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
        // we wrap in string in string literal to account for empty key
        key: `${key}`,
        type: types[i],
        value: values[i],
      }));

      return {
        data: result,
        hasMore: next !== "0",
        cursor: Number(next),
      };
    },
    [prefix, database],
    { initialData: [] },
  );

  async function confirmAndDelete(key: string) {
    await confirmAlert({
      title: "Delete Key",
      message: `Are you sure you want to delete this key?
This action cannot be undone.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Yes, Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", key);
          try {
            const redis = new Redis({
              url: `https://${database.endpoint}`,
              token: database.password,
            });
            await mutate(redis.del(key), {
              optimisticUpdate(data) {
                return data.filter((i) => i.key !== key);
              },
              shouldRevalidateAfter: false,
            });
            toast.style = Toast.Style.Success;
            toast.title = "Deleted";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed";
            toast.message = `${error}`;
          }
        },
      },
    });
  }

  return (
    <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setPrefix} isShowingDetail>
      {!isLoading && !items.length ? (
        <List.EmptyView
          title="Data on a break"
          description="Quick, lure it back with some CLI magic!"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create New Key"
                target={<CreateKey database={database} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        items.map((item, index) => (
          <List.Item
            key={item.key + index}
            icon={TYPE_ICON[item.type] || Icon.Key}
            title={item.key}
            subtitle={item.type}
            detail={<List.Item.Detail markdown={formatValue(item.value)} />}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Create New Key"
                  target={<CreateKey database={database} />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Key"
                  onAction={() => confirmAndDelete(item.key)}
                  style={Action.Style.Destructive}
                />
                <OpenInUpstash route={`redis/${database.database_id}/data-browser`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateKey({ database }: { database: RedisDatabase }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ type: string; key: string }>({
    async onSubmit(values) {
      const { type, key } = values;
      const toast = await showToast(Toast.Style.Animated, "Creating", key);
      const redis = new Redis({
        url: `https://${database.endpoint}`,
        token: database.password,
      });
      try {
        switch (type) {
          case "string":
            await redis.set(key, "value");
            break;
          case "list":
            await redis.lpush(key, null);
            break;
        }
        toast.style = Toast.Style.Success;
        toast.message = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      key: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create New Key" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="STRING" value="string" />
        <Form.Dropdown.Item title="LIST" value="list" />
      </Form.Dropdown>
      <Form.TextField title="Key Name" placeholder="mykey" {...itemProps.key} />
      <Form.Description text="After creating the key, you can edit the value" />
    </Form>
  );
}
