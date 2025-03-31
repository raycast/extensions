import { Provider } from "u/context";
import { Grid } from "@raycast/api";
import getViewMode from "u/getViewMode";
import { useState, useEffect } from "react";

import {
  enableTimeSeconds,
  enableTimeFormat,
  enableTimeSecondary,
  enableTimeSecondaryOffset,
  enableTimeTitle,
} from "u/options";
import SVG from "u/getSvg";

export default function CommandTime() {
  const setViewMode = getViewMode();
  const [time, setTime] = useState({
    hours: "00",
    minutes: "00",
    seconds: enableTimeSeconds ? "00" : "",
    period: enableTimeFormat ? "AM" : "",
  });

  const [secondaryTime, setSecondaryTime] = useState({
    hours: "00",
    minutes: "00",
    seconds: enableTimeSeconds ? "00" : "",
    period: enableTimeFormat ? "AM" : "",
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const offsetNow = new Date(now.getTime() + enableTimeSecondaryOffset * 60 * 60 * 1000);
      const timeOptions = {
        hour: "numeric" as const,
        minute: "numeric" as const,
        second: enableTimeSeconds ? ("numeric" as const) : undefined,
        hour12: enableTimeFormat !== false,
      };
      const timeStr = now.toLocaleTimeString("en-US", timeOptions).split(/[:\s]/);
      const secondaryTimeStr = offsetNow.toLocaleTimeString("en-US", timeOptions).split(/[:\s]/);
      setTime({
        hours: timeStr[0].padStart(2, "0"),
        minutes: timeStr[1].padStart(2, "0"),
        seconds: enableTimeSeconds && timeStr[2] ? timeStr[2].padStart(2, "0") : "",
        period: enableTimeFormat !== false ? (enableTimeSeconds && timeStr[3] ? timeStr[3] : timeStr[2]) : "",
      });
      setSecondaryTime({
        hours: secondaryTimeStr[0].padStart(2, "0"),
        minutes: secondaryTimeStr[1].padStart(2, "0"),
        seconds: enableTimeSeconds && secondaryTimeStr[2] ? secondaryTimeStr[2].padStart(2, "0") : "",
        period:
          enableTimeFormat !== false
            ? enableTimeSeconds && secondaryTimeStr[3]
              ? secondaryTimeStr[3]
              : secondaryTimeStr[2]
            : "",
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const zones = [{ name: enableTimeSecondary, offset: enableTimeSecondaryOffset }];
  const secondaryTimeTitle = zones[0].name;
  return (
    <Provider>
      <Grid
        columns={enableTimeFormat ? 4 : 5}
        inset={Grid.Inset.Small}
        aspectRatio={setViewMode}
        searchBarPlaceholder={""}
      >
        <Grid.Section title={enableTimeTitle ? "Time" : undefined} key={"Local Time"}>
          <TimeDisplay time={time} />
        </Grid.Section>
        {enableTimeSecondary && enableTimeSecondaryOffset && (
          <Grid.Section title={enableTimeTitle ? `${secondaryTimeTitle}` : undefined} key={"Secondary Time"}>
            <TimeDisplay time={secondaryTime} />
          </Grid.Section>
        )}
      </Grid>
    </Provider>
  );
}

function TimeDisplay({ time }: { time: { hours: string; minutes: string; seconds: string; period: string } }) {
  const timeUnits = [
    { key: "hours", value: time.hours, tooltip: "Hours" },
    { key: "minutes", value: time.minutes, tooltip: "Minutes" },
    ...(enableTimeSeconds ? [{ key: "seconds", value: time.seconds, tooltip: "Seconds" }] : []),
    ...(enableTimeFormat && time.period ? [{ key: "period", value: time.period.toUpperCase(), tooltip: "AM/PM" }] : []),
  ];

  return timeUnits.map((unit) => (
    <Grid.Item
      key={unit.key}
      content={{
        value: {
          source: SVG({ day: unit.value }),
        },
        tooltip: unit.tooltip,
      }}
    />
  ));
}
