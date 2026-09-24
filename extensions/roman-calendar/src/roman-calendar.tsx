import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  CivilDate,
  displayCivil,
  displayYear,
  daysInMonth,
  formatRoman,
  monthName,
  parseCivil,
  parseRoman,
  RomanDate,
  toCivil,
  toRoman,
} from "./calendar";

type Direction = "modern" | "roman";
function today(): CivilDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}
function explanation(r: RomanDate): string {
  if (r.relation.kind === "exact")
    return "This date falls exactly on a Roman reference day.";
  if (r.relation.kind === "pridie")
    return "Pridie means the day before the reference day.";
  if (r.relation.kind === "bis")
    return "The leap day repeats the sixth day before the Kalends of March.";
  return `Inclusive counting: the starting day and the reference day are both counted (${r.relation.count} days).`;
}
export default function Command() {
  const [direction, setDirection] = useState<Direction>("modern");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CivilDate>(today());
  const [fallbackYear, setFallbackYear] = useState(new Date().getFullYear());
  const result = useMemo(() => {
    try {
      const civil =
        direction === "modern"
          ? query.trim()
            ? parseCivil(query)
            : selected
          : query.trim()
            ? toCivil(parseRoman(query, fallbackYear))
            : today();
      return { civil, roman: toRoman(civil), error: undefined };
    } catch (error) {
      return {
        civil: undefined,
        roman: undefined,
        error: error instanceof Error ? error.message : "Invalid date.",
      };
    }
  }, [direction, query, selected, fallbackYear]);
  const choose = (date: CivilDate) => {
    setSelected(date);
    setDirection("modern");
    setQuery("");
  };
  return (
    <List
      filtering={false}
      searchBarPlaceholder={
        direction === "modern"
          ? "21 April 753 BCE, or leave blank for the selected day"
          : "a.d. X Kal. Oct. 2026"
      }
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Conversion direction"
          value={direction}
          onChange={(value) => {
            setDirection(value as Direction);
            setQuery("");
          }}
        >
          <List.Dropdown.Item title="Gregorian → Roman" value="modern" />
          <List.Dropdown.Item title="Roman → Gregorian" value="roman" />
        </List.Dropdown>
      }
    >
      {result.error ? (
        <List.Item
          icon={Icon.ExclamationMark}
          title="Invalid date"
          subtitle={result.error}
        />
      ) : (
        result.civil &&
        result.roman && (
          <>
            <List.Section title="Conversion">
              <List.Item
                icon={Icon.Calendar}
                title={displayCivil(result.civil)}
                subtitle={formatRoman(result.roman, false, false)}
                accessories={[{ text: "Gregorian date" }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Gregorian Date"
                      content={displayCivil(result.civil)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Full Roman Date"
                      content={formatRoman(result.roman, false)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Abbreviated Roman Date"
                      content={formatRoman(result.roman, true)}
                    />
                  </ActionPanel>
                }
              />
              <List.Item
                icon={Icon.Text}
                title={formatRoman(result.roman)}
                subtitle={explanation(result.roman)}
                accessories={[{ text: "Full Latin form" }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Full Roman Date"
                      content={formatRoman(result.roman)}
                    />
                    <Action.CopyToClipboard
                      title="Copy Abbreviated Roman Date"
                      content={formatRoman(result.roman, true)}
                    />
                  </ActionPanel>
                }
              />
              <List.Item
                icon={Icon.Hashtag}
                title={formatRoman(result.roman, true)}
                accessories={[{ text: "Abbreviated form" }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Abbreviated Roman Date"
                      content={formatRoman(result.roman, true)}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
            <List.Section
              title={`${monthName(result.civil.month)} ${displayYear(result.civil.year)} · select a day`}
            >
              {Array.from(
                { length: daysInMonth(result.civil.month, result.civil.year) },
                (_, i) => {
                  const date = {
                    year: result.civil!.year,
                    month: result.civil!.month,
                    day: i + 1,
                  };
                  const roman = toRoman(date);
                  const mark =
                    roman.reference === "kalends"
                      ? "K"
                      : roman.reference === "nones"
                        ? "N"
                        : "I";
                  const count =
                    roman.relation.kind === "ante"
                      ? `${roman.relation.count}`
                      : roman.relation.kind === "bis"
                        ? "bis VI"
                        : roman.relation.kind === "pridie"
                          ? "pridie"
                          : "";
                  return (
                    <List.Item
                      key={i}
                      icon={
                        date.day === result.civil!.day
                          ? Icon.CheckCircle
                          : Icon.Circle
                      }
                      title={`${String(date.day).padStart(2, "0")}  ${formatRoman(roman, true, false)}`}
                      subtitle={`${mark}${count ? ` · ${count}` : ""}`}
                      accessories={[
                        {
                          text:
                            roman.reference === "kalends"
                              ? "Kalends"
                              : roman.reference === "nones"
                                ? "Nones"
                                : "Ides",
                        },
                      ]}
                      actions={
                        <ActionPanel>
                          <Action
                            title="Select This Day"
                            onAction={() => choose(date)}
                          />
                          <Action.CopyToClipboard
                            title="Copy Full Roman Date"
                            content={formatRoman(roman)}
                          />
                          <Action.CopyToClipboard
                            title="Copy Abbreviated Roman Date"
                            content={formatRoman(roman, true)}
                          />
                        </ActionPanel>
                      }
                    />
                  );
                },
              )}
            </List.Section>
            <List.Section title="Rules">
              <List.Item
                title="Nones: 7th · Ides: 15th"
                subtitle="March, May, July, and October; otherwise the 5th and 13th"
              />
              <List.Item
                title="Inclusive counting"
                subtitle="Dates after the Ides count toward next month's Kalends"
              />
              <List.Item
                title="Leap years"
                subtitle="24 February is bis sextum; BCE years have no year zero"
              />
            </List.Section>
          </>
        )
      )}
      {direction === "roman" && (
        <List.Section title="Year used when omitted">
          <List.Item
            title={`${fallbackYear}`}
            subtitle="The year belongs to the reference month"
            actions={
              <ActionPanel>
                <Action
                  title="Use Current Year"
                  onAction={() => setFallbackYear(new Date().getFullYear())}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
