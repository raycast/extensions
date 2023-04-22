import { useState, useEffect } from "react";
import { ActionPanel, Detail, List, Action, Icon } from "@raycast/api";
import { exec } from "child_process";

const DetailPassword = ({
  networkName,
  setIsLoading,
}: {
  networkName: string;
  setIsLoading: (loading: boolean) => void;
}) => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    exec(`security find-generic-password -wa ${networkName}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        setIsLoading(false);
        return;
      }

      setPassword(stdout.trim());
    });
  }, []);

  return <Detail markdown={`Password: ${password}`} />;
};

export default function Command() {
  const [networks, setNetworks] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    exec(
      "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s | sed '1d; s/^[ *]//g' | awk '{print $1}' | sort | uniq",
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          setIsLoading(false);
          return;
        }

        const networkList: Array<string> = stdout
          .trim() // remove trailing newline
          .split("\n") // split into lines
          .slice(1) // remove header row
          .map((line) => line.trim().split(/\s+/)[0]); // extract the network names

        if (networkList?.length > 0) {
          setNetworks(networkList);
        }
        setIsLoading(false);
      }
    );
  }, []);

  return (
    <List isLoading={isLoading}>
      {networks.map((network, index) => (
        <List.Item
          key={index}
          icon={Icon.Wifi}
          title={network}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Details"
                target={<DetailPassword networkName={network} setIsLoading={setIsLoading} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
