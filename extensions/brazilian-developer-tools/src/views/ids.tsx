import { Action, ActionPanel, List } from "@raycast/api";
import { RandomNanoid } from "../actions/ids/random-nanoid";
import { RandomUuidV4 } from "../actions/ids/random-uuid-v4";
import { RandomUuidV7 } from "../actions/ids/random-uuid-v7";

const randomUuid = new RandomUuidV4();
const randomNanoid = new RandomNanoid();
const randomUuidV7 = new RandomUuidV7();

export function Ids() {
  return (
    <List navigationTitle="Generate IDs">
      <List.Item
        title="UUID v4"
        subtitle="123e4567-e89b-12d3-a456-426614174000"
        actions={
          <ActionPanel>
            <Action title={randomUuid.name} onAction={randomUuid.action} />
          </ActionPanel>
        }
      />
      <List.Item
        title="UUID v7"
        subtitle="123e4567-e89b-12d3-a456-426614174000"
        actions={
          <ActionPanel>
            <Action title={randomUuidV7.name} onAction={randomUuidV7.action} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Nanoid"
        subtitle="V1StGXR8_Z5jdHi6B-myT"
        actions={
          <ActionPanel>
            <Action title={randomNanoid.name} onAction={randomNanoid.action} />
          </ActionPanel>
        }
      />
    </List>
  );
}
