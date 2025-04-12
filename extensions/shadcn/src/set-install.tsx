import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export type managerType = "npm" | "pnpm" | "yarn" | "bun";

export default function Command() {
  const { value: activeManager, setValue: setManager, isLoading } = useLocalStorage<managerType>("manager", "npm");

  const managers: managerType[] = ["npm", "pnpm", "yarn", "bun"];

  return (
    <List isLoading={isLoading}>
      {managers.map((item) => (
        <List.Item
          key={item}
          icon={activeManager === item ? Icon.CheckCircle : Icon.Circle}
          title={item}
          subtitle={`Set preferred package manager to ${item}`}
          keywords={["nice"]}
          actions={
            <ActionPanel>
              <Action.SubmitForm
                title={"Set as Default"}
                icon={Icon.Clipboard}
                onSubmit={async () => {
                  await setManager(item);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
