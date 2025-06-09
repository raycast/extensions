import { Action, ActionPanel, Icon, launchCommand, LaunchType, List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { AutomationFormValues } from "./types/types";

interface Automation {
  [automationName: string]: { description: string; values: Array<string> };
}

export default function Command() {
  const [automations, setAutomations] = useState<Automation>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const generateArguments = (automationName: string) => {
    const result: AutomationFormValues = {
      name: automationName,
      description: automations[automationName].description || "",
    };
    automations[automationName].values.map((value: string, index: number) => {
      result[`link-${index + 1}`] = value;
    });
    return result;
  };

  const fetchAutomations = async () => {
    setIsLoading(true);
    const items = await LocalStorage.allItems();
    // Sort items by key
    const sortedItems = Object.keys(items)
      .sort()
      .reduce((acc, key) => {
        acc[key] = JSON.parse(items[key]);
        return acc;
      }, {} as Automation);
    setAutomations(sortedItems as Automation);
    setIsLoading(false);
  };

  const handleDeleteAutomation = async (automationName: string) => {
    await LocalStorage.removeItem(automationName);
    setAutomations((prevAutomations) => {
      const newAutomations = { ...prevAutomations };
      delete newAutomations[automationName];
      return newAutomations;
    });
  };

  useEffect(() => {
    fetchAutomations().catch((error) => {
      console.error("Error fetching automations:", error);
    });
  }, []);

  return (
    <List isShowingDetail isLoading={isLoading}>
      {Object.keys(automations).map((automation_name) => (
        <List.Item
          key={automation_name}
          title={automation_name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Description"
                    text={automations[automation_name].description || "No description provided"}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  {automations[automation_name].values.map((value: string, index: number) => (
                    <List.Item.Detail.Metadata.Label title={`Link ${index + 1}`} text={value} key={index} />
                  ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Run Automation"
                icon={Icon.Rocket}
                onAction={async () =>
                  await launchCommand({
                    name: "run-automation",
                    type: LaunchType.UserInitiated,
                    arguments: { automationName: automation_name },
                  })
                }
              />
              <Action
                title="Edit Automation"
                icon={Icon.Pencil}
                onAction={async () =>
                  await launchCommand({
                    name: "create-automation",
                    type: LaunchType.UserInitiated,
                    arguments: { ...generateArguments(automation_name) },
                  })
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Remove Automation"
                onAction={() => handleDeleteAutomation(automation_name)}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
