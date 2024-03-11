import { useEffect } from "react";
import { pluralize, useDrinkTimes, useLastDrinkedAt } from "./common";
import { popToRoot, updateCommandMetadata } from "@raycast/api";

export default function Command() {
  const [, drinkNow] = useLastDrinkedAt();

  const { nextDrinkReminder } = useDrinkTimes();

  useEffect(() => {
    drinkNow();
    updateCommandMetadata({
      subtitle:
        nextDrinkReminder > 0
          ? `Next reminder in ${nextDrinkReminder} ${pluralize(nextDrinkReminder, "minute")}`
          : "Time to drink some water!",
    });
    popToRoot();
  }, []);

  return null;
}
