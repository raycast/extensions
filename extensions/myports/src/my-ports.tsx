import { ActionPanel, Detail, List, Action, showToast, Toast } from "@raycast/api";
import { ReactNode, useEffect, useState } from "react";

type PortData = {
  key: string;
  value: string;
  type: string;
};

const markdownTable = (portInfo: PortData[]) => {
  const header = "| Key | Value |\n| --- | ----- |";
  const rows = portInfo.map((item) => `| ${item.key} | ${item.value} |`);
  return [header, ...rows].join("\n");
};

export default function Command() {
  const [portData, setPortData] = useState<Record<string, PortData[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRepos() {
      try {
        const response = await fetch("http://localhost:1212/");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = (await response.json()) as Record<string, PortData[]>;
        setPortData(data);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to fetch data", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRepos();
  }, []);

  const renderList = () => {
    const items: ReactNode[] = [];
    for (const port in portData) {
      const portInfo = portData[port];

      const last2Digits = `${port}`.slice(-2);

      const sBranch = portInfo.find((info) => info.key === "SBRANCH");
      const reactBranch = portInfo.find((info) => info.key === "SRBRANCH");
      const adminBranch = portInfo.find((info) => info.key === "SRABRANCH");

      items.push(
        <List.Item
          id={`${port}`}
          keywords={[`${port}`, last2Digits]}
          key={port}
          icon={{ source: `../assets/${last2Digits}.svg` }}
          title={`${port}`}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown={markdownTable(portInfo)} />} />
            </ActionPanel>
          }
          accessories={[
            { tag: sBranch, icon: "../assets/sh.svg" },
            { tag: reactBranch, icon: "../assets/react.svg" },
            { tag: adminBranch, icon: "../assets/react-admin.svg" },
          ]}
        />,
      );
    }
    return items;
  };

  return <List isLoading={isLoading}>{renderList()}</List>;
}
