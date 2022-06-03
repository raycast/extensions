import { List, Icon, Detail, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { ShowInfo } from "./utils";
export default function Command() {
  const [info, setInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>("");

  useEffect(() => {
    async function response() {
      const info = await ShowInfo();

      !info && setError("# Create Account First");

      setInfo(info);

      setLoading(false);
    }
    response();
  }, []);

  if (error) return <Detail markdown={error} />;

  return (
    <List isLoading={loading} navigationTitle="Account Information">
      <List.Item icon={Icon.Dot} key={info.id} title={"ID:"} subtitle={info.id} />
      <List.Item
        icon={Icon.Envelope}
        key={info.address}
        title={"Email:"}
        subtitle={info.address}
        actions={
          <ActionPanel title="Actions">
            <Action.CopyToClipboard content={info.address} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Calendar}
        key={info.createdAt}
        title={"CreatedAt:"}
        subtitle={new Date(info.createdAt).toLocaleString()}
      />
    </List>
  );
}
