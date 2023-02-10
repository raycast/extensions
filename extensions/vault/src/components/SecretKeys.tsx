import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";

import { getSecret, Secret } from "../api/secret";

export const SecretKeys = (props: { secretEngine: string; path: string }) => {
  const [state, setState] = useState<{ secret?: Secret }>({ secret: undefined });

  const fetchSecret = async () => {
    const secret = await getSecret(props.secretEngine, props.path);
    setState((oldState) => ({ ...oldState, secret: secret }));
  };

  useEffect(() => {
    fetchSecret();
  }, []);

  return (
    <List isLoading={!state.secret} searchBarPlaceholder="Filter keys by name...">
      {state.secret
        ? Object.keys(state.secret).map((key) => (
            <SecretKeyItem key={key} secretKey={key} secretValue={state.secret ? state.secret[key] : ""} />
          ))
        : null}
    </List>
  );
};

const SecretKeyItem = (props: { secretKey: string; secretValue: string }) => {
  return (
    <List.Item
      id={props.secretKey}
      key={props.secretKey}
      title={props.secretKey}
      icon={Icon.Eye}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy" icon={Icon.List} content={props.secretValue} />
          <Action
            title="Show"
            icon={Icon.Eye}
            onAction={() => showToast(Toast.Style.Success, props.secretKey, props.secretValue)}
          />
        </ActionPanel>
      }
    />
  );
};
