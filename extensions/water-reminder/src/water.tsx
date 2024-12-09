import { Icon, launchCommand, LaunchType, LocalStorage, MenuBarExtra } from "@raycast/api";
import { useState, useEffect } from "react";
import { WaterTrackingFormValues } from "./configurate-water-reminder";

export default function Command() {
  const [storedValues, setStoredValues] = useState<WaterTrackingFormValues & { lastReminderTime?: number }>();

  useEffect(() => {
    async function loadStoredData() {
      const storedGoal = await LocalStorage.getItem<string>("waterGoal");
      const storedReminder = await LocalStorage.getItem<string>("waterReminder");
      const storedQuantity = await LocalStorage.getItem<string>("waterQuantity");
      const storedLastReminder = await LocalStorage.getItem<string>("lastReminderTime");

      if (storedGoal && storedReminder && storedQuantity) {
        setStoredValues({
          goal: storedGoal,
          reminder: storedReminder,
          quantity: storedQuantity,
          lastReminderTime: storedLastReminder ? Number(storedLastReminder) : Date.now(),
        });
      }
    }

    loadStoredData();
  }, []);

  const handleDrinkWater = async () => {
    setStoredValues((prevStoredValues) => {
      if (prevStoredValues) {
        const { goal, quantity } = prevStoredValues;
        const newGoal = Math.max(Number(goal) - Number(quantity), 0).toString();

        LocalStorage.setItem("waterGoal", newGoal);

        return {
          ...prevStoredValues,
          goal: newGoal,
        };
      }
      return prevStoredValues;
    });
  };

  return (
    <MenuBarExtra icon={Icon.Raindrop}>
      <MenuBarExtra.Item title={`Remaining Goal: ${storedValues?.goal} ml`} />
      <MenuBarExtra.Item title={`Drink every: ${storedValues?.reminder} min`} />
      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Drink Water"
        icon={Icon.Mug}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={handleDrinkWater}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Configurate Water Reminder"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => launchCommand({ name: "configurate-water-reminder", type: LaunchType.UserInitiated })}
      />
    </MenuBarExtra>
  );
}
