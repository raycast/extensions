import { List, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import { getOwnershipCode } from "./utils/api";
import { Response } from "./utils/types";
import { OPTIONAL_OWNERSHIP_DNS_RECORDS, REQUIRED_OWNERSHIP_DNS_RECORDS } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";

interface State {
  code?: string;
  error?: string;
  isLoading?: false;
}

export default function GetOwnershipCode() {
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

  return state.error ? (
    <ErrorComponent error={state.error} />
  ) : (
    <List isLoading={state.code === "" || state.isLoading}>
      <List.Section title="Required">
        {REQUIRED_OWNERSHIP_DNS_RECORDS.map((r) => (
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
        {OPTIONAL_OWNERSHIP_DNS_RECORDS.map((r) => (
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
