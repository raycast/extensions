import { MenuBarExtra, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { getTodayTimings } from "./api";
import {
  getSuhoorTime,
  getIftarTime,
  formatTime,
  getMenuBarTitle,
  isRamadan,
  getFastingStatus,
  timeToDate,
  adjustHijriDate,
} from "./utils";

interface MenuBarData {
  suhoor: string;
  iftar: string;
  hijriDay: string;
  hijriMonth: number;
  hijriMonthName: string;
  hijriYear: string;
  gregorianReadable: string;
  isRamadanNow: boolean;
  daysUntilRamadan: number | null;
}

export default function MenuBarCommand() {
  const [data, setData] = useState<MenuBarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getTodayTimings();
        const { timings, date } = result.data;

        const rawHijri = date.hijri;
        const adjusted = adjustHijriDate(
          parseInt(rawHijri.day, 10),
          rawHijri.month.number,
          parseInt(rawHijri.year, 10),
        );

        const hijriMonth = adjusted.month;
        const inRamadan = isRamadan(hijriMonth);

        let daysUntilRamadan: number | null = null;

        if (!inRamadan) {
          const currentHijriMonth = hijriMonth;
          const currentHijriDay = adjusted.day;

          if (currentHijriMonth < 9) {
            // Before Ramadan this Hijri year
            // Rough estimate: each Hijri month ~29.5 days
            const monthsUntil = 9 - currentHijriMonth;
            const daysLeftInCurrentMonth = 30 - currentHijriDay;
            daysUntilRamadan = Math.round(
              daysLeftInCurrentMonth + (monthsUntil - 1) * 29.5,
            );
          } else {
            // After Ramadan — next year's Ramadan
            const monthsUntil = 12 - currentHijriMonth + 9;
            const daysLeftInCurrentMonth = 30 - currentHijriDay;
            daysUntilRamadan = Math.round(
              daysLeftInCurrentMonth + (monthsUntil - 1) * 29.5,
            );
          }
        }

        setData({
          suhoor: getSuhoorTime(timings.Fajr),
          iftar: getIftarTime(timings.Maghrib),
          hijriDay: String(adjusted.day),
          hijriMonth: adjusted.month,
          hijriMonthName: adjusted.monthName,
          hijriYear: String(adjusted.year),
          gregorianReadable: date.readable,
          isRamadanNow: inRamadan,
          daysUntilRamadan: daysUntilRamadan,
        });
      } catch (error) {
        // Silently fail for menu bar — don't spam toasts
        console.error("Menu bar fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function getProgressIcon(): Icon {
    if (!data || !data.isRamadanNow) return Icon.CircleProgress;

    const status = getFastingStatus(data.suhoor, data.iftar);
    if (status === "before-suhoor") return Icon.CircleProgress;
    if (status === "after-iftar") return Icon.CircleProgress100;

    // During fasting: calculate progress from suhoor to iftar
    const now = new Date();
    const suhoorDate = timeToDate(data.suhoor);
    const iftarDate = timeToDate(data.iftar);
    const total = iftarDate.getTime() - suhoorDate.getTime();
    const elapsed = now.getTime() - suhoorDate.getTime();
    const pct = Math.max(0, Math.min(1, elapsed / total));

    if (pct < 0.125) return Icon.CircleProgress;
    if (pct < 0.375) return Icon.CircleProgress25;
    if (pct < 0.625) return Icon.CircleProgress50;
    if (pct < 0.875) return Icon.CircleProgress75;
    return Icon.CircleProgress100;
  }

  const title = data
    ? getMenuBarTitle(
        data.suhoor,
        data.iftar,
        data.isRamadanNow,
        data.daysUntilRamadan ?? undefined,
      )
    : "";

  return (
    <MenuBarExtra icon={getProgressIcon()} title={title} isLoading={loading}>
      {data && (
        <>
          {/* Ramadan Status */}
          {data.isRamadanNow ? (
            <>
              {/* Fasting status as a top-level title */}
              {getFastingStatus(data.suhoor, data.iftar) === "fasting" ? (
                <MenuBarExtra.Item title="Currently fasting" />
              ) : getFastingStatus(data.suhoor, data.iftar) ===
                "after-iftar" ? (
                <MenuBarExtra.Item title="Fast complete" />
              ) : (
                <MenuBarExtra.Item title="Suhoor time" />
              )}

              <MenuBarExtra.Item
                icon={Icon.Moon}
                title="Suhoor"
                subtitle={formatTime(data.suhoor)}
              />
              <MenuBarExtra.Item
                icon={Icon.Sun}
                title="Iftar"
                subtitle={formatTime(data.iftar)}
              />

              <MenuBarExtra.Separator />

              <MenuBarExtra.Item
                icon={Icon.Calendar}
                title={`${data.hijriDay} ${data.hijriMonthName} ${data.hijriYear} AH`}
              />
            </>
          ) : (
            <>
              {data.daysUntilRamadan !== null && (
                <MenuBarExtra.Item
                  icon={Icon.Hourglass}
                  title={`${data.daysUntilRamadan} days until Ramadan`}
                />
              )}

              <MenuBarExtra.Separator />

              <MenuBarExtra.Item
                icon={Icon.Calendar}
                title={`${data.hijriDay} ${data.hijriMonthName} ${data.hijriYear} AH`}
              />
            </>
          )}
        </>
      )}
    </MenuBarExtra>
  );
}
