import { List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";

interface Data {
  statusCode: number;
  messages: string;
  data: any;
}

function formatRp(value: number): string {
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  });
  return formatter.format(value);
}

const fetchData = async (token: string): Promise<Data> => {
  const response = await axios.get<Data>("https://api.mayar.id/hl/v1/balance", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export default function Command() {
  const preferences = getPreferenceValues();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = preferences["required-password"];
    fetchData(token)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  }, []);

  return (
    <List isLoading={loading}>
      <List.Item
        icon={{ source: "wallet.png" }}
        key="balance"
        title="Balance"
        accessories={[{ text: loading ? "Loading..." : formatRp(data?.data.balance) }]}
      />
      <List.Item
        icon={{ source: "active.png" }}
        key="balance-active"
        title="Balance Active"
        accessories={[{ text: loading ? "Loading..." : formatRp(data?.data.balanceActive) }]}
      />
      <List.Item
        icon={{ source: "pending.png" }}
        key="balance-pending"
        title="Balance Pending"
        accessories={[{ text: loading ? "Loading..." : formatRp(data?.data.balancePending) }]}
      />
    </List>
  );
}
