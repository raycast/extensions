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
        nextDrinkReminder == null
          ? "Take your first sip to start!"
          : nextDrinkReminder > 0
            ? `Next reminder in ${nextDrinkReminder} ${pluralize(nextDrinkReminder, "minute")}`
            : `You should've had water ${nextDrinkReminder * -1}  ${pluralize(nextDrinkReminder * -1, "minute")} ago`,
    });
    popToRoot();
  }, []);

  return null;
}
