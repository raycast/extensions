import { useState } from "react";
import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { Configuration, Reload, setSecretEngineAndGoToTree } from "./actions";
import { usePromise } from "@raycast/utils";
import { callGetSysMounts, getSecretEngine } from "../utils";
import { VaultMount } from "../interfaces";

export function VaulEngines() {
  const { push } = useNavigation();

  const [engines, setEngines] = useState<VaultMount[]>([]);

  const { isLoading, revalidate } = usePromise(async () => {
    setEngines(await callGetSysMounts());
  });

  return (
    <List filtering={true} isLoading={isLoading} searchBarPlaceholder="Search in engines">
      <List.EmptyView
        title={"No engines found"}
        actions={
          <ActionPanel>
            <Configuration />
          </ActionPanel>
        }
      />

      {engines.map((engine) => (
        <List.Item
          key={engine.name}
          title={engine.name}
          subtitle={engine.description ? engine.description : ""}
          icon={Icon.AppWindow}
          accessories={
            engine.name === getSecretEngine() ? [{ icon: Icon.Check, tooltip: "Engine currently used" }] : []
          }
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Cog}
                title="Select Secret Engine"
                onAction={() => setSecretEngineAndGoToTree(engine.name, push)}
              />
              <Configuration />
              <Reload revalidate={revalidate} />
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={"````\n" + JSON.stringify(engine, undefined, 2) + "\n````"} />}
        />
      ))}
    </List>
  );
}
