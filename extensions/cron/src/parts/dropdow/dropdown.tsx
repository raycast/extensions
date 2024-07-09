import { useContext } from "react";
import { Grid } from "@raycast/api";
import { getAllMonthsOfYear } from "u/getDate";
import { getAvatarIcon } from "@raycast/utils";
import { Context } from "u/context";
import { customTheme } from "u/options";

function mapValueToColor(value: string): string | undefined {
  switch (value) {
    case "Blue":
      return "#406c8e";
    case "Green":
      return "#47795b";
    case "Magenta":
      return "#822a66";
    case "Orange":
      return "#925b23";
    case "Purple":
      return "#615098";
    case "Red":
      return "#8d3f41";
    case "Yellow":
      return "#856b00";
    case "Default":
    default:
      return "#666666";
  }
}

export default function Dropdown() {
  const { currentMonth, thisMonth, currentYear, setCurrentMonth } = useContext(Context);
  const allMonths = getAllMonthsOfYear();

  const handleMonthChange = (newValue: string) => {
    setCurrentMonth(parseInt(newValue));
  };

  return (
    <Grid.Dropdown
      tooltip="Months"
      placeholder="Search months"
      onChange={handleMonthChange}
      value={currentMonth.toString()}
      defaultValue={thisMonth.toString()}
    >
      <Grid.Dropdown.Section title={currentYear.toString()}>
        {allMonths.map((month) => {
          const monthNumber = month.monthNumberAsString.padStart(2, "0").split("").join(" ");
          const isThisMonth = month.monthNumberAsString === thisMonth.toString();
          const source = getAvatarIcon(monthNumber, {
            background: isThisMonth ? mapValueToColor(customTheme) : "#333",
            gradient: false,
          });

          return (
            <Grid.Dropdown.Item
              icon={{ source: source }}
              key={month.monthNumberAsString}
              title={month.monthStringLong}
              value={month.monthNumberAsString}
            />
          );
        })}
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );
}
