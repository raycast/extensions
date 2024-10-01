import { getProgressIcon } from "@raycast/utils";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { listSecretsWithTOTP } from "./helper";

// Ente colors - purple #A400B6, orange #FF9800
const getProgressColor = (remainingTime: number) => {
  return remainingTime > 10 ? "#A400B6" : "#FF9800";
};

const RERENDER_INTERVAL = 1000;

export default function Command() {
  const [secrets, setSecrets] = useState(listSecretsWithTOTP());

  useEffect(() => {
    const interval = setInterval(() => {
      setSecrets(listSecretsWithTOTP());
    }, RERENDER_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  if (secrets.length === 0) {
    return (
      <List>
        {/* TODO: Update MSG */}
        <List.Item title={"No Secrets found"} />
      </List>
    );
  }

  return (
    <List navigationTitle="Get TOTP" searchBarPlaceholder="Search...">
      {secrets.map((item, index) => {
        return (
          <List.Item
            key={index}
            title={item.service_name}
            subtitle={item.username}
            icon={Icon.Key}
            keywords={[item.service_name, item.username ?? ""]}
            accessories={[
              {
                tag: item.current_totp,
              },
              {
                icon: {
                  source: getProgressIcon(item.current_totp_time_remaining / 30),
                  tintColor: getProgressColor(item.current_totp_time_remaining),
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title={"Copy TOTP"}
                  icon={getProgressIcon(item.current_totp_time_remaining)}
                  content={item.current_totp}
                  concealed={true}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
