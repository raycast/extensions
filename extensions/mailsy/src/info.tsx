import { List, Icon, Detail, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { ShowInfo } from "./utils";

interface info {
  id: string;
  address: string;
  createdAt: string;
}

export default function Command() {
  const [info, setInfo] = useState<info>({
    id: "",
    address: "",
    createdAt: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function response() {
      const info = await ShowInfo();

      !info && setError("# Create Account First");

      setInfo({
        id: info.id,
        address: info.address,
        createdAt: info.createdAt,
      });

      setLoading(false);
    }
    response();
  }, []);

  if (error) return <Detail markdown={error} />;

  return (
    <List isLoading={loading}>
      <List.Item icon={Icon.Dot} key={info.id} title={"ID:"} subtitle={info.id} />
      <List.Item
        icon={Icon.Envelope}
        title={"Email:"}
        subtitle={info.address}
        actions={
          <ActionPanel title="Actions">
            <Action.CopyToClipboard content={info.address} />
          </ActionPanel>
        }
      />
      <List.Item icon={Icon.Calendar} title={"CreatedAt:"} subtitle={new Date(info.createdAt).toLocaleString()} />
    </List>
  );
}
