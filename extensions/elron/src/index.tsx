import { Action, ActionPanel, List, Icon } from "@raycast/api";
import Times from "./times";

const TALLINN_STOP_ID = "64-5354-93";
const TARTU_STOP_ID = "64-5354-97";

export default function Command() {
  return (
    <List>
      <List.Item
        icon="list-icon.png"
        title="Tallinn -> Tartu"
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Times"
              icon={Icon.Train}
              target={
                <Times
                  originStopAreaId={TALLINN_STOP_ID}
                  destinationStopAreaId={TARTU_STOP_ID}
                  route={"Tallinn -> Tartu"}
                />
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon="list-icon.png"
        title="Tartu -> Tallinn"
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Times"
              icon={Icon.Train}
              target={
                <Times
                  originStopAreaId={TARTU_STOP_ID}
                  destinationStopAreaId={TALLINN_STOP_ID}
                  route={"Tartu -> Tallinn"}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
