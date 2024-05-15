import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import {Secret, TOTP} from "otpauth";
import * as fs from "fs";

const _max_results = 20;
const _preps = getPreferenceValues<Preps>();

const getTimeRemaining = function() {
  return 30 - (Math.trunc(new Date().valueOf() / 1000) % 30);
};

export default function Command() {
  const gauth = fs.readFileSync(_preps.authFile, "utf8");
  const otpConfigs:OtpConfig[] = JSON.parse(gauth);

  const [searchText, setSearchText] = useState<string>("");
  const [filteredList, filterList] = useState<OtpConfig[]>(otpConfigs);
  
  useEffect(() => {
    filterList(otpConfigs
      .filter((item) => item.account.includes(searchText) || item.website.includes(searchText))
      .map((item) => {
        const totp = new TOTP({
          issuer: item.website || "",
          label: item.account || "",
          secret: Secret.fromBase32(item.secret.replaceAll(/\s*/g, ''))
        });
        console.log(item);
        item.code = totp.generate();
        item.uri = totp.toString();
        return item;
      })
    );
  }, [searchText]);
  
  return (
    <List
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle={`Time Remaining: ${getTimeRemaining()}`}
    >
    {filteredList.map((config) => (
      <List.Item key={config.secret} icon="list-icon.png" title={config.website || ""} subtitle={config.account || ""} accessories={[{ tag: (config?.code || "") }]} actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.Paste title="Fill the OTP code" content={config?.code} />
            <Action.CopyToClipboard title="Copy the OTP code" content={config?.code} />
            <Action.CopyToClipboard title="Copy the OTP URI" content={config?.uri} />
          </ActionPanel.Section>
        </ActionPanel>
      }/>
    ))}
    </List>
  );
}
