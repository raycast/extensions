import React, { useContext } from "react";
import { Grid } from "@raycast/api";
import { Context } from "u/context";
import { getTitle, getSubTitle } from "@/month/getTitle";
import { getWeekNumber } from "u/getDate";
import { Calendar } from "calendar";
import { v4 as AHD } from "uuid";
import { Day } from "@/days/days";
import { weekDays } from "u/options";

export default function Month() {
  const { currentDay, currentYear, currentMonth, weekFormat, enableWeek } = useContext(Context);
  let cal;

  if (weekFormat === "monday") {
    cal = new Calendar(0);
  } else {
    cal = new Calendar(1);
  }

  const weeks = cal.monthDays(currentYear, currentMonth - 1);
  const weekdays =
    weekFormat === "monday"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <React.Fragment>
      {weekDays && (
        <Grid.Section key={"Weekday names"}>
          <React.Fragment key={AHD()}>
            {enableWeek && <Day key={AHD()} type="name" day={parseInt("Wk")} name="Nr" />}
            {weekdays.map((weekday) => (
              <Day key={AHD()} type="name" day={1} name={weekday} />
            ))}
          </React.Fragment>
        </Grid.Section>
      )}
      <Grid.Section title={getTitle()} subtitle={getSubTitle()} key={"Section Days"}>
        {weeks.map((week) => {
          const weekNumber = getWeekNumber(new Date(currentYear, currentMonth - 1, week[0] === 0 ? 1 : week[0]));

          return (
            <React.Fragment key={AHD()}>
              {enableWeek && <Day key={AHD()} type="week" day={weekNumber} />}
              {week.map((day, dayIndex) => {
                if (day === 0) {
                  return <Day key={AHD()} type="empty" day={day} />;
                } else if (day === currentDay) {
                  return <Day key={AHD()} day={day} type="today" hasEvents />;
                } else if (dayIndex === 0 && weekFormat === "sunday") {
                  return <Day key={AHD()} day={day} type="sunday" />;
                } else if (dayIndex === 6 && weekFormat === "sunday") {
                  return <Day key={AHD()} type="saturday" day={day} />;
                } else if (dayIndex === 5 && weekFormat === "monday") {
                  return <Day key={AHD()} day={day} type="saturday" />;
                } else if (dayIndex === 6 && weekFormat === "monday") {
                  return <Day key={AHD()} type="sunday" day={day} />;
                } else {
                  return <Day key={AHD()} type="day" day={day} />;
                }
              })}
            </React.Fragment>
          );
        })}
      </Grid.Section>
    </React.Fragment>
  );
}
