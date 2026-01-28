import crypto from "crypto";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useFetch, useForm } from "@raycast/utils";
import { useState } from "react";

export default function DNSRecords() {
  const { username, password } = getPreferenceValues<Preferences>();
  const sha = crypto
    .createHash("sha1")
    .update(username + "|" + password)
    .digest("hex");
  const url = `https://freedns.afraid.org/api/?action=getdyndns&v=2&sha=${sha}`;

  const { isLoading, data, revalidate } = useFetch(url, {
    mapResult(result: string) {
      if (result.startsWith("ERROR")) {
        const error = result.split("ERROR: ")[1];
        throw new Error(error);
      }
      const data = result.split("\n").map((row) => {
        const record = row.split("|");
        return {
          domain: record[0],
          address: record[1],
          updateUrl: record[2],
        };
      });
      return {
        data,
      };
    },
    initialData: [],
    failureToastOptions: {
      title: "ERROR",
    },
  });

  return (
    <List isLoading={isLoading}>
      {data.map((record) => (
        <List.Item
          key={record.domain}
          icon={getFavicon(`https://${record.domain}`, { fallback: Icon.Globe })}
          title={record.domain}
          subtitle={record.address}
          actions={
            <ActionPanel>
              {!isLoading && (
                <Action.Push
                  icon={Icon.Pencil}
                  title="Update"
                  target={<Update record={record} onUpdate={revalidate} />}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
interface Record {
  domain: string;
  address: string;
  updateUrl: string;
}
function Update({ record, onUpdate }: { record: Record; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<{ address: string }>({
    initialValues: {
      address: record.address,
    },
    onSubmit() {
      setExecute(true);
    },
  });
  const { isLoading } = useFetch(record.updateUrl + `&address=${values.address}`, {
    mapResult(result: string) {
      if (result.startsWith("ERROR")) {
        const error = result.split("ERROR: ")[1];
        setExecute(false);
        throw new Error(error);
      }
      showToast(Toast.Style.Success, "SUCCESS", result);
      onUpdate();
      pop();
      return {
        data: undefined,
      };
    },
    execute,
    failureToastOptions: {
      title: "ERROR",
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={record.domain} />
      <Form.TextField title="Address" placeholder={record.address} {...itemProps.address} />
      <Form.Description text="TIP:  Leave empty to use your own IP" />
    </Form>
  );
}
