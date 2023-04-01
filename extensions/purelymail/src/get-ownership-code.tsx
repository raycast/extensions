import { List, Detail, Action, ActionPanel, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { getOwnershipCode } from "./utils/api";
import { Response } from "./utils/types";

interface State {
  code?: string;
  error?: string;
  isLoading?: false;
}

export default function Command() {
  const [state, setState] = useState<State>({
    code: "",
    error: "",
    isLoading: false,
  });

  useEffect(() => {
    async function getFromApi() {
      const response: Response = await getOwnershipCode();

      switch (response.type) {
        case "error":
          setState((prevState) => {
            return { ...prevState, error: response.message, isLoading: false };
          });
          break;

        case "success":
          setState((prevState) => {
            return { ...prevState, error: "", code: response.result.code };
          });
          break;

        default:
          setState((prevState) => {
            return { ...prevState, isLoading: false };
          });
          break;
      }
    }

    getFromApi();
  }, []);

  const required = [
    { type: "MX", host: "", value: "mailserver.purelymail.com." },
    { type: "TXT", host: "", value: "v=spf1 include:_spf.purelymail.com ~all" },
  ];
  const optional = [
    { type: "CNAME", host: "purelymail1._domainkey", value: "key1.dkimroot.purelymail.com." },
    { type: "CNAME", host: "purelymail2._domainkey", value: "key2.dkimroot.purelymail.com." },
    { type: "CNAME", host: "purelymail3._domainkey", value: "key3.dkimroot.purelymail.com." },
    { type: "CNAME", host: "_dmarc", value: "dmarcroot.purelymail.com." },
  ];
  return state.error ? (
    <Detail
      markdown={"⚠️" + state.error}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <List isLoading={state.code === "" || state.isLoading}>
      <List.Section title="Required">
        {required.map((r) => (
          <List.Item
            key={r.value}
            title={r.value}
            subtitle={"HOST: " + (r.host || "(Empty)")}
            accessories={[{ tag: r.type }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard title="Copy Value" content={r.value} />
                <Action.CopyToClipboard title="Copy Host" content={r.host} />
                <Action.CopyToClipboard
                  title="Copy Type"
                  content={r.type}
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                />
              </ActionPanel>
            }
          />
        ))}
        {state.code && (
          <List.Item
            key={state.code}
            title={state.code}
            subtitle="HOST: (Empty)"
            accessories={[{ tag: "TXT" }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard title="Copy Value" content={state.code} />
                <Action.CopyToClipboard title="Copy Host" content="" />
                <Action.CopyToClipboard title="Copy Type" content={state.code} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Optional">
        {optional.map((r) => (
          <List.Item
            key={r.value}
            title={r.value}
            subtitle={"HOST: " + r.host || "(Empty)"}
            accessories={[{ tag: r.type }]}
            actions={
              <ActionPanel title="Copy">
                <Action.CopyToClipboard title="Copy Value" content={r.value} />
                <Action.CopyToClipboard title="Copy Host" content={r.host} />
                <Action.CopyToClipboard title="Copy Type" content={r.type} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
