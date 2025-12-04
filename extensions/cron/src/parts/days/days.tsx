import { useContext } from "react";
import { Grid } from "@raycast/api";
import Actions from "@/actions/actions";
import { v4 as AHD } from "uuid";
import { getIcon } from "u/getIcon";
import { Context } from "u/context";

interface DayProps {
  type: "day" | "week" | "today" | "saturday" | "sunday" | "empty" | "name";
  day: number; // Add a default value for day
  id?: number | string;
  hasEvents?: boolean;
  name?: string;
}

export function Day({ type, day, hasEvents, name }: DayProps) {
  const { currentYear, currentMonth } = useContext(Context);
  const source = getIcon({
    iconDay: day,
    iconToday: type === "today",
    iconEvents: hasEvents === true,
    iconWeekend: type === "saturday" || type === "sunday",
    iconName: name,
  });

  const AHID = `SIT:${type}, SID:${day}, SIM:${currentMonth}, SIY:${currentYear} + SIU:${AHD()}`;

  const now = new Date();
  const todayId = `SID:${now.getDate()}`;

  return (
    <Grid.Item
      id={type === "today" ? todayId : AHID}
      content={{
        value: {
          source: type === "empty" ? " " : source,
          tintColor:
            type === "week"
              ? {
                  light: "#666666",
                  dark: "#666666",
                  adjustContrast: true,
                }
              : undefined,
        },
        tooltip: "",
      }}
      actions={<Actions global={type !== "week" && type !== "empty" && type !== "name" ? false : true} day={day} />}
    />
  );
}
