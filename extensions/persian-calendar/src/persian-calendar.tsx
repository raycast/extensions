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
  const [selectedItemId, setSelectedItemId] = useState(`${today.jy}-${today.jm}-${today.jd}`);

  const absoluteMonth = today.jy * 12 + today.jm - 1 + monthOffset;
  const jy = Math.floor(absoluteMonth / 12);
  const jm = (((absoluteMonth % 12) + 12) % 12) + 1;
  const firstGregorian = toGregorian(jy, jm, 1);
  const leadingSpaces = weekdayIndex(firstGregorian.gy, firstGregorian.gm, firstGregorian.gd);
  const numberOfDays = jalaaliMonthLength(jy, jm);

  function openMonth(offset: number) {
    const absolute = today.jy * 12 + today.jm - 1 + offset;
    const year = Math.floor(absolute / 12);
    const month = (((absolute % 12) + 12) % 12) + 1;
    setMonthOffset(offset);
    setSelectedItemId(`${year}-${month}-${offset === 0 ? today.jd : 1}`);
  }

  const previousMonth = () => openMonth(monthOffset - 1);
  const nextMonth = () => openMonth(monthOffset + 1);
  const jumpToToday = () => openMonth(0);

  function navigationActions() {
    return (
      <ActionPanel>
        <Action title="Go to Today" onAction={jumpToToday} />
        <Action title="Previous Month" onAction={previousMonth} />
        <Action title="Next Month" onAction={nextMonth} />
      </ActionPanel>
    );
  }

  return (
    <Grid
      columns={7}
      filtering={false}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
      searchBarPlaceholder="Browse Persian dates (Iran time)"
    >
      <Grid.Section
        title={`${MONTH_NAMES[jm - 1]} ${faDigits(jy)}`}
        subtitle="Based on Iran time • Fridays are highlighted in orange"
      >
        {SHORT_WEEKDAYS.map((label, index) => (
          <Grid.Item
            key={`weekday-${index}`}
            id={`weekday-${index}`}
            content="🗓️"
            title={label}
            subtitle={WEEKDAYS[index]}
            actions={navigationActions()}
          />
        ))}

        {Array.from({ length: leadingSpaces }, (_, index) => (
          <Grid.Item
            key={`empty-${index}`}
            id={`empty-${index}`}
            content="▫️"
            title=" "
            actions={navigationActions()}
          />
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
            `**Jalali Date:** ${persianDate}`,
            "",
            `**Gregorian Date:** ${gregorianDate}`,
            "",
            isToday ? "📍 Today (Iran time)" : "",
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
                    title="View Date Details"
                    target={
                      <Detail
                        navigationTitle="Date Details"
                        markdown={markdown}
                        actions={
                          <ActionPanel>
                            <Action.CopyToClipboard title="Copy Jalali Date" content={persianDate} />
                            <Action.CopyToClipboard title="Copy Gregorian Date" content={gregorianDate} />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action.CopyToClipboard title="Copy Jalali Date" content={persianDate} />
                  <Action
                    title="Next Month"
                    onAction={nextMonth}
                    shortcut={{
                      Windows: { modifiers: ["ctrl", "shift"], key: "arrowRight" },
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowRight" },
                    }}
                  />
                  <Action
                    title="Previous Month"
                    onAction={previousMonth}
                    shortcut={{
                      Windows: { modifiers: ["ctrl", "shift"], key: "arrowLeft" },
                      macOS: { modifiers: ["cmd", "shift"], key: "arrowLeft" },
                    }}
                  />
                  <Action title="Go to Today" onAction={jumpToToday} />
                  <Action.CopyToClipboard title="Copy Gregorian Date" content={gregorianDate} />
                </ActionPanel>
              }
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
