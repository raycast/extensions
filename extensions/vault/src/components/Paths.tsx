import { ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";

import { getPaths } from "../api/paths";
import { SecretKeys } from "./SecretKeys";

export const Paths = (props: { secretEngine: string; prefix: string }) => {
  const [state, setState] = useState<{ paths: string[] }>({ paths: [] });

  const fetchPaths = async () => {
    const paths = await getPaths(props.secretEngine, props.prefix);
    setState((oldState) => ({ ...oldState, paths: paths }));
  };

  useEffect(() => {
    fetchPaths();
  }, []);

  return (
    <List isLoading={state.paths.length === 0} searchBarPlaceholder="Filter paths / secrets by name...">
      {state.paths.map((path) => (
        <PathItem key={path} secretEngine={props.secretEngine} prefix={props.prefix} path={path} />
      ))}
    </List>
  );
};

const PathItem = (props: { secretEngine: string; prefix: string; path: string }) => {
  const { push } = useNavigation();

  return (
    <List.Item
      id={props.path}
      key={props.path}
      title={props.path}
      icon={props.path.slice(-1) === "/" ? Icon.List : Icon.Document}
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title="Select"
            icon={Icon.List}
            onAction={() =>
              props.path.slice(-1) === "/"
                ? push(<Paths secretEngine={props.secretEngine} prefix={`${props.prefix}${props.path}`} />)
                : push(<SecretKeys secretEngine={props.secretEngine} path={`${props.prefix}${props.path}`} />)
            }
          />
        </ActionPanel>
      }
    />
  );
};
