import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { exec } from "child_process";

import DisplayView, { Resource } from "./resource";

const Command = () => {
  const { push } = useNavigation();
  const [state, setState] = useState<Resource[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);

  useEffect(() => {
    kubectlGet();
  }, []);

  // TODO: possibly get --all-namespaces ??
  /**
   *
   */
  const kubectlGet = () => {
    /**
     * returns all resources within the current context
     */
    exec(`kubectl get all -o wide`, (err, out) => {
      if (err != null) {
        return;
      }

      const lines = out.split("\n");

      /**
       * ignore irrelavant resources or empty strings
       * @param line
       * @returns
       */
      function isRelevant(line: string): boolean {
        return line.length > 0 && !line.startsWith("NAME ");
      }

      /**
       * get relevant keywords from line
       * @param line
       * @returns
       */
      function parse(line: string): Resource {
        const [typedef, id] = line.split(" ")[0].split("/");

        return {
          id: id,
          line: line,
          type: typedef.replace(".apps", ""),
        } as Resource;
      }

      setState(lines.filter(isRelevant).map(parse));
    });
  };

  /**
   * TODO: make query smarter
   * @param resource
   * @returns
   */
  function isQueryMatch(resource: Resource) {
    return query == null || resource.id.toLowerCase().includes(query.toLowerCase());
  }

  /**
   * TODO: possibly sort by type first? number of matching characters? etc.
   * @param a
   * @param b
   * @returns
   */
  function sortResources(a: Resource, b: Resource) {
    return 0;
  }

  /**
   *
   * @param resource
   * @param index
   * @returns
   */
  function renderItems(resource: Resource, index: number) {
    return (
      <List.Item
        key={index}
        title={resource.id}
        accessoryTitle={resource.type}
        actions={
          <ActionPanel>
            <Action
              title="Logs"
              icon={Icon.Text}
              onAction={() => push(<DisplayView resource={resource} command={"logs"} />)}
            />
            <Action
              title="Describe"
              icon={Icon.Document}
              onAction={() => push(<DisplayView resource={resource} command={"describe"} />)}
            />
            <Action
              title="Reload"
              icon={Icon.ArrowClockwise}
              shortcut={{ key: "r", modifiers: ["cmd"] }}
              onAction={() => kubectlGet()}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name..."
      onSearchTextChange={(query) => setQuery(query)}
    >
      {state.filter(isQueryMatch).sort(sortResources).map(renderItems)}
    </List>
  );
};

export default Command;
