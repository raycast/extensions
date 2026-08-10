import { ActionPanel, List, Action, showHUD } from "@raycast/api";
import checkBikeInstalled from "./index";
import { createCornellNotesTemplate, createDailyBikeTemplate, createShoppingListTemplate } from "./scripts";

export default function main() {
  const error_alert = checkBikeInstalled();
  if (error_alert !== undefined) {
    return error_alert;
  }

  return (
    <List>
      <List.Item
        title="Daily Bike"
        actions={
          <ActionPanel>
            <Action
              title="Create Bike with Daily Note Template"
              onAction={() => {
                daily_bike();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Cornell Note"
        actions={
          <ActionPanel>
            <Action
              title="Create Bike with Cornell Note Template"
              onAction={() => {
                cornell();
              }}
            />
          </ActionPanel>
        }
      />

      <List.Item
        title="Shopping List"
        actions={
          <ActionPanel>
            <Action
              title="Create Bike with Shopping List Template"
              onAction={() => {
                shopping_list();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function daily_bike() {
  await createDailyBikeTemplate();
  await showHUD("Created New Bike Document");
}

async function cornell() {
  await createCornellNotesTemplate();
  await showHUD("Created New Bike Document");
}

async function shopping_list() {
  await createShoppingListTemplate();
  await showHUD("Created New Bike Document");
}
