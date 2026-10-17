import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useState, useMemo } from "react";
import { SolarDate, LunarDate } from "lunar-date-vn";
import { format } from "date-fns";
import { getCanChi } from "./utils/date-utils";
import DayDetailView from "./view-day-detail";

enum ConversionMode {
  SolarToLunar = "solar-to-lunar",
  LunarToSolar = "lunar-to-solar",
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [mode, setMode] = useState<ConversionMode>(ConversionMode.SolarToLunar);

  const results = useMemo(() => {
    if (!searchText.trim()) {
      return [];
    }

    // Use regex to extract day, month, year
    // Supported formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, YYYY/MM/DD, DD/MM
    // Improved to allow spaces around separators
    const fullDateRegex =
      /^\s*(\d{1,2})\s*[./\s-]\s*(\d{1,2})\s*[./\s-]\s*(\d{4})\s*$/;
    const isoDateRegex =
      /^\s*(\d{4})\s*[./\s-]\s*(\d{1,2})\s*[./\s-]\s*(\d{1,2})\s*$/;
    const partialDateRegex = /^\s*(\d{1,2})\s*[./\s-]\s*(\d{1,2})\s*$/;

    let day: number, month: number, year: number;
    const text = searchText.trim();

    if (fullDateRegex.test(text)) {
      const match = text.match(fullDateRegex);
      if (!match) return [];
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      year = parseInt(match[3]);
    } else if (isoDateRegex.test(text)) {
      const match = text.match(isoDateRegex);
      if (!match) return [];
      year = parseInt(match[1]);
      month = parseInt(match[2]);
      day = parseInt(match[3]);
    } else if (partialDateRegex.test(text)) {
      const match = text.match(partialDateRegex);
      if (!match) return [];
      day = parseInt(match[1]);
      month = parseInt(match[2]);
      year = new Date().getFullYear();
    } else {
      return [];
    }

    // Basic range validation
    if (day < 1 || day > 31 || month < 1 || month > 12) return [];

    const parsedDate = new Date(year, month - 1, day);

    if (mode === ConversionMode.SolarToLunar) {
      const solar = new SolarDate(parsedDate);
      const lunar = solar.toLunarDate();
      if (!lunar) return [];
      const lunarInfo = lunar.get();
      const canChi = getCanChi(parsedDate);

      return [
        {
          id: "result",
          title: `Lunar Date: ${lunarInfo.day}/${lunarInfo.month}/${lunarInfo.year}`,
          subtitle: lunarInfo.leap_month ? "(Leap Month)" : "",
          accessories: [
            { text: `Year: ${canChi.year}` },
            { text: `Month: ${canChi.month}` },
            { text: `Day: ${canChi.day}` },
          ],
          copyText: `${lunarInfo.day}/${lunarInfo.month}/${lunarInfo.year}`,
          date: parsedDate,
        },
      ];
    } else {
      // Lunar to Solar
      try {
        // LunarDate constructor takes an object { day, month, year, leap?, timeZone? }
        const lunarInfoParams = {
          day,
          month,
          year,
          hour: 0,
          yearIndex: 0, // Placeholder, init() should fill this
        } as import("lunar-date-vn").ILunarDate;
        const lunar = new LunarDate(lunarInfoParams);

        // Crucial: Initialize the lunar date object
        const lunarAny = lunar as unknown as { init?: () => void };
        if (typeof lunarAny.init === "function") {
          lunarAny.init();
        }

        const solar = lunar.toSolarDate();
        if (!solar) return [];
        const solarDate = solar.toDate();
        const canChi = getCanChi(solarDate);

        return [
          {
            id: "result",
            title: `Solar Date: ${format(solarDate, "dd/MM/yyyy")}`,
            subtitle: format(solarDate, "EEEE"),
            accessories: [
              { text: `Year: ${canChi.year}` },
              { text: `Month: ${canChi.month}` },
              { text: `Day: ${canChi.day}` },
            ],
            copyText: format(solarDate, "dd/MM/yyyy"),
            date: solarDate,
          },
        ];
      } catch {
        return [];
      }
    }
  }, [searchText, mode]);

  return (
    <List
      searchBarPlaceholder={
        mode === ConversionMode.SolarToLunar
          ? "Type solar date (e.g. 29/12/2025)"
          : "Type lunar date (e.g. 10/11/2025)"
      }
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Conversion Mode"
          storeValue={true}
          onChange={(newValue) => setMode(newValue as ConversionMode)}
        >
          <List.Dropdown.Item
            title="Solar → Lunar"
            value={ConversionMode.SolarToLunar}
            icon={Icon.Sun}
          />
          <List.Dropdown.Item
            title="Lunar → Solar"
            value={ConversionMode.LunarToSolar}
            icon={Icon.Moon}
          />
        </List.Dropdown>
      }
    >
      {searchText === "" ? (
        <List.EmptyView
          title="Type a date to convert"
          description="Example: 29/12/2025 or 29/12"
          icon={Icon.Calendar}
        />
      ) : results.length > 0 ? (
        results.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            subtitle={item.subtitle}
            accessories={item.accessories}
            icon={{
              source:
                mode === ConversionMode.SolarToLunar ? Icon.Moon : Icon.Sun,
              tintColor: Color.Blue,
            }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Result"
                  content={item.copyText}
                />
                <Action.Push
                  title="View Detail"
                  target={<DayDetailView date={item.date} />}
                  icon={Icon.Eye}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="Invalid Date Format"
          description="Try DD/MM/YYYY or DD/MM"
          icon={Icon.ExclamationMark}
        />
      )}
    </List>
  );
}
