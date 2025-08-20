import { Detail, List, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface Preferences {
  "org-id": string;
}

interface User {
  full_name: string;
  photo: string;
  admin: boolean;
}

interface Balances {
  balance_cents: number;
  total_raised: number;
}

interface Transaction {
  amount_cents: number;
  date: string;
  memo: string;
  href: string;
}

interface OrgDataInterface {
  name: string;
  created_at: string;
  balances: Balances;
  donation_link: string;
  users: User[];
}

export default function Main() {
  const [apiData, setApiData] = useState<OrgDataInterface | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const response = await fetch(`https://hcb.hackclub.com/api/v3/organizations/${preferences["org-id"]}`, {
          headers: {
            Accept: "application/json",
          },
        });
        const response2 = await fetch(
          `https://hcb.hackclub.com/api/v3/organizations/${preferences["org-id"]}/transactions`,
          {
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (!response.ok || !response2.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as OrgDataInterface;
        const transactionsData = (await response2.json()) as Transaction[];
        setApiData(data);
        setTransactions(transactionsData);
      } catch (error) {
        console.error(error);
      }
    };

    fetchOrg();
  }, []);

  const markdown = `
# ${apiData ? apiData.name : "Loading..."}

![](https://hc-cdn.hel1.your-objectstorage.com/s/v3/42eb885e3ebc20bd5e94782b7b4bcb31bcc956d3_i.png)
${transactions ? transactions.map((tx: Transaction) => `- ${tx.amount_cents / 100} USD on ${tx.date} (${tx.memo}) [Open on HCB](${tx.href}) `).join("\n") : "Loading..."}
`;

  return (
    <>
      <List>
        <List.Item title="Team Members" icon={apiData?.users[0]?.photo} />
      </List>
      <Detail
        markdown={markdown}
        navigationTitle={apiData ? apiData.name : "Loading..."}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Creation Date"
              text={`${apiData ? new Date(apiData.created_at).toLocaleString() : "Loading..."}`}
            />
            <Detail.Metadata.Label
              title="Balance"
              text={`${apiData ? apiData.balances.balance_cents / 100 : "Loading..."} USD`}
            />
            <Detail.Metadata.Label
              title="Total USD raised"
              text={`${apiData ? apiData.balances.total_raised / 100 : "Loading..."} USD`}
            />
            <Detail.Metadata.Link
              title="Donate Now"
              target={apiData ? apiData.donation_link : "loading"}
              text="Donate Now"
            />
            <Detail.Metadata.TagList title="Team Members">
              {apiData?.users?.map((user: User, index: number) => (
                <Detail.Metadata.TagList.Item
                  key={index}
                  text={user.full_name || `Member ${index + 1}`}
                  icon={user.photo}
                  color={user.admin === true ? "red" : undefined}
                />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        }
      />
    </>
  );
}
