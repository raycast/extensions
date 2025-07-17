/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ActionPanel, Action, List, popToRoot, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { AFSPreferences, StateItem } from "./modals";
import User from "./user";
import States from "./states";
import { useEffect, useState } from "react";
import { HttpFunctionResult } from "./http";

let afsPreferences: AFSPreferences;
let states: States;

async function handleItemSelect(item: any) {
  const result: HttpFunctionResult<any> = await states.updateState(item.id);
  if (!result.success) {
    await showToast({ style: Toast.Style.Failure, title: "Fehler", message: result.message });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Stamp successful!",
    message: item.id == -1 ? "Time tracking updated successfully." : `You're now clocked in to "${item.title}".`,
  });
  await popToRoot();
}

export default function Command() {
  const [items, setItems] = useState<StateItem[]>();

  useEffect(() => {
    const loadData = async () => {
      afsPreferences = getPreferenceValues<AFSPreferences>();
      states = new States(afsPreferences);
      const user: User = new User(afsPreferences);

      if (!(await user.login())) return;

      const stateResult: HttpFunctionResult<StateItem[]> = await states.getStates();
      if (!stateResult.success) return;

      setItems([{ id: -1, title: "Gehen" }, { id: 0, title: "Kommen" }, ...stateResult.data!]);
    };
    loadData();
  }, []);

  return (
    <List isLoading={items == undefined}>
      {items?.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={() => handleItemSelect(item)}></Action.SubmitForm>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
