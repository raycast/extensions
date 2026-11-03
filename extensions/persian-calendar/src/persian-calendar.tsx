import { Action, ActionPanel, Detail, Grid } from "@raycast/api";
import { useState } from "react";
import {
  faDigits,
  getIranToday,
  gregorianText,
  jalaliText,
  jalaaliMonthLength,
  MONTH_NAMES,
  SHORT_WEEKDAYS,
  toGregorian,
  weekdayIndex,
  WEEKDAYS,
} from "./jalali";

export default function Command() {
  const today = getIranToday();
  const [monthOffset, setMonthOffset] = useState(0);

  const absoluteMonth = today.jy * 12 + today.jm - 1 + monthOffset;
  const jy = Math.floor(absoluteMonth / 12);
  const jm = (((absoluteMonth % 12) + 12) % 12) + 1;
  const firstGregorian = toGregorian(jy, jm, 1);
  const leadingSpaces = weekdayIndex(firstGregorian.gy, firstGregorian.gm, firstGregorian.gd);
  const numberOfDays = jalaaliMonthLength(jy, jm);

  const previousMonth = () => setMonthOffset((current) => current - 1);
  const nextMonth = () => setMonthOffset((current) => current + 1);
  const jumpToToday = () => setMonthOffset(0);

  return (
    <Grid
      columns={7}
      filtering={false}
      navigationTitle={`${MONTH_NAMES[jm - 1]} ${faDigits(jy)}`}
      searchBarPlaceholder="تقویم شمسی • ساعت ایران"
    >
      <Grid.Section
        title={`${MONTH_NAMES[jm - 1]} ${faDigits(jy)}`}
        subtitle="تقویم بر اساس ساعت ایران • جمعه با رنگ نارنجی مشخص شده است"
      >
        {SHORT_WEEKDAYS.map((label, index) => (
          <Grid.Item key={`weekday-${index}`} content="🗓️" title={label} subtitle={WEEKDAYS[index]} />
        ))}

        {Array.from({ length: leadingSpaces }, (_, index) => (
          <Grid.Item key={`empty-${index}`} content="▫️" title=" " />
        ))}

        {Array.from({ length: numberOfDays }, (_, index) => {
          const jd = index + 1;
          const g = toGregorian(jy, jm, jd);
          const weekday = WEEKDAYS[weekdayIndex(g.gy, g.gm, g.gd)];
          const isToday = jy === today.jy && jm === today.jm && jd === today.jd;
          const isFriday = weekday === "جمعه";
          const persianDate = jalaliText(jy, jm, jd);
          const gregorianDate = gregorianText(g.gy, g.gm, g.gd);
          const markdown = [
            `# ${weekday}، ${faDigits(jd)} ${MONTH_NAMES[jm - 1]} ${faDigits(jy)}`,
            "",
            `**تاریخ شمسی:** ${persianDate}`,
            "",
            `**تاریخ میلادی:** ${gregorianDate}`,
            "",
            isToday ? "📍 امروز (به وقت ایران)" : "",
          ].join("\n");

          return (
            <Grid.Item
              key={`${jy}-${jm}-${jd}`}
              id={`${jy}-${jm}-${jd}`}
              content={isToday ? "🟢" : isFriday ? "🟠" : "🔹"}
              title={faDigits(jd)}
              subtitle={faDigits(`${g.gm}/${g.gd}`)}
              keywords={[String(jd), persianDate, gregorianDate, MONTH_NAMES[jm - 1]]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="نمایش جزئیات روز"
                    target={
                      <Detail
                        markdown={markdown}
                        actions={
                          <ActionPanel>
                            <Action.CopyToClipboard title="کپی تاریخ شمسی" content={persianDate} />
                            <Action.CopyToClipboard title="کپی تاریخ میلادی" content={gregorianDate} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action
                    title="ماه بعد"
                    onAction={nextMonth}
                    shortcut={{
                      Windows: { modifiers: ["ctrl", "shift"], key: "arrowRight" },
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowRight" },
                    }}
                  />
                  <Action
                    title="ماه قبل"
                    onAction={previousMonth}
                    shortcut={{
                      Windows: { modifiers: ["ctrl", "shift"], key: "arrowLeft" },
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowLeft" },
                    }}
                  />
                  <Action title="بازگشت به امروز" onAction={jumpToToday} />
                  <Action.CopyToClipboard title="کپی تاریخ شمسی" content={persianDate} />
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
