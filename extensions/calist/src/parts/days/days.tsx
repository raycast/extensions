import { useContext } from "react";
import { Grid } from "@raycast/api";
import Actions from "@/actions/actions";
import { v4 as AHD } from "uuid";
import { getIcon } from "u/getIcon";
import { getDayName } from "u/getName";
import { Context } from "u/context";

interface DayProps {
  type: "day" | "week" | "today" | "saturday" | "sunday" | "empty";
  day: number;
  id?: number | string;
  hasEvents?: boolean;
}

export function Day({ type, day, hasEvents }: DayProps) {
  const { currentYear, currentMonth } = useContext(Context);
  const source = getIcon({
    iconDay: day,
    iconToday: type === "today",
    iconEvents: hasEvents === false,
    iconWeekend: type === "saturday" || type === "sunday",
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
        tooltip: type !== "week" && type !== "empty" ? `${getDayName(day)} ${day}, ${currentMonth} ${currentYear}` : "",
      }}
      actions={<Actions global={type !== "week" && type !== "empty" ? false : true} day={day} />}
    />
  );
}
