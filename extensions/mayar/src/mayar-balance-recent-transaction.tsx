import { MenuBarExtra, getPreferenceValues } from "@raycast/api";
import { Key, useEffect, useState } from "react";
import axios from "axios";
import TimeAgo from "javascript-time-ago";
import id from "javascript-time-ago/locale/id";

TimeAgo.addDefaultLocale(id);
const timeAgo = new TimeAgo("id-ID");

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

const fetchData = async (token: string): Promise<Data[]> => {
  const [response1, response2] = await axios.all([
    axios.get<Data>("https://api.mayar.id/hl/v1/balance", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    axios.get<Data>("https://api.mayar.id/hl/v1/transactions?pageSize=10&page=1", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
  ]);
  return [response1.data, response2.data];
};

export default function Command() {
  const preferences = getPreferenceValues();
  const [data, setData] = useState<any | null>(null);
  const [dataTrx, setDataTrx] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = preferences["required-password"];
    fetchData(token)
      .then((result) => {
        setData(result[0]);
        setDataTrx(result[1]);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
      });
  }, []);

  return (
    <MenuBarExtra
      isLoading={loading}
      icon="https://pub-e4d31eae5d834409a04a5f020a42923e.r2.dev/mayar-favicon-black.png"
      tooltip="Mayar Balance and Recent Transaction"
    >
      <MenuBarExtra.Section title="Mayar Balance">
        <MenuBarExtra.Item
          icon={{ source: "wallet.png" }}
          title={"Total: " + formatRp(data?.data.balance)}
          onAction={() => {
            console.log("balance clicked");
          }}
        />
        <MenuBarExtra.Item
          icon={{ source: "active.png" }}
          title={"Active: " + formatRp(data?.data.balanceActive)}
          onAction={() => {
            console.log("balance active clicked");
          }}
        />
        <MenuBarExtra.Item
          icon={{ source: "pending.png" }}
          title={"Pending: " + formatRp(data?.data.balancePending)}
          onAction={() => {
            console.log("balance pending clicked");
          }}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Recent Transactions">
        {(dataTrx?.data || []).map(
          (trx: { id: Key | null | undefined; createdAt: number; credit: number; customer: { email: string } }) => (
            <MenuBarExtra.Item
              key={trx.id}
              title={timeAgo.format(trx.createdAt) + " - " + formatRp(trx.credit) + " - " + trx?.customer?.email}
              onAction={() => {
                console.log("transaction list clicked");
              }}
            />
          )
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
