import { ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";

import { getSecretEngines, SecretEngine } from "../api/secretEngine";
import { Paths } from "./Paths";

export const SecretEngines = () => {
  const [state, setState] = useState<{ secretEngines: SecretEngine[] }>({ secretEngines: [] });

  const fetchSecretEngines = async () => {
    const secretEngines = await getSecretEngines();
    setState((oldState) => ({ ...oldState, secretEngines: secretEngines }));
  };

  useEffect(() => {
    fetchSecretEngines();
  }, []);

  return (
    <List isLoading={state.secretEngines.length === 0} searchBarPlaceholder="Filter secret engines by name...">
      {state.secretEngines.map((secretEngine) => (
        <SecretEngineItem key={secretEngine.name} secretEngine={secretEngine} />
      ))}
    </List>
  );
};

const SecretEngineItem = (props: { secretEngine: SecretEngine }) => {
  const { push } = useNavigation();

  return (
    <List.Item
      id={props.secretEngine.name}
      key={props.secretEngine.name}
      title={props.secretEngine.name}
      keywords={props.secretEngine.name.split("/")}
      icon={Icon.Globe}
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title="Select"
            icon={Icon.List}
            onAction={() => push(<Paths secretEngine={props.secretEngine.name} prefix="/" />)}
          />
        </ActionPanel>
      }
    />
  );
};
