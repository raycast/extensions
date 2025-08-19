import { ActionPanel, Action, List, popToRoot, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { StateItem } from "./models/models";
import User from "./services/user";
import States from "./services/states";
import { useEffect, useState } from "react";
import { HttpFunctionResult } from "./services/http";
import { LoginResponseDTO } from "./dto/auth.dto";

let afsPreferences: ExtensionPreferences;
let states: States;

async function handleItemSelect(item: StateItem) {
  const result: HttpFunctionResult = await states.updateState(item.id);
  if (!result.success) {
    await showToast({ style: Toast.Style.Failure, title: "Fehler", message: result.message });
    return;
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Stamp successful!",
    message: item.id === -1 ? "Time tracking updated successfully." : `You're now clocked in to "${item.title}".`,
  });
  await popToRoot();
}

export default function Command() {
  const [items, setItems] = useState<StateItem[]>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      afsPreferences = getPreferenceValues<ExtensionPreferences>();
      states = new States(afsPreferences);
      const user: User = new User(afsPreferences);

      const loginResponse: HttpFunctionResult<LoginResponseDTO> = await user.login();
      if (!loginResponse.success) {
        await showToast({ style: Toast.Style.Failure, title: "Login failed", message: loginResponse.message });
        setIsLoading(false);
        return;
      }

      const stateResult: HttpFunctionResult<StateItem[]> = await states.getStates();

      if (!stateResult.success) {
        await showToast({ style: Toast.Style.Failure, title: "Error", message: stateResult.message });
        setIsLoading(false);
        return;
      }

      setItems([{ id: -1, title: "Gehen" }, { id: 0, title: "Kommen" }, ...stateResult.data!]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  return (
    <List isLoading={isLoading}>
      {items?.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          actions={
            <ActionPanel>
              <Action title={`Switch to ${item.title}`} onAction={() => handleItemSelect(item)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
