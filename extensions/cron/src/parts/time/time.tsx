import { useState, useEffect, useContext } from "react";
import { Grid } from "@raycast/api";
import Actions from "@/actions/actions";
import { Context } from "u/context";
import {
  enableTimeSeconds,
  enableTimeTitle,
  enableTimeFormat,
  enableTimeSecondary,
  enableTimeSecondaryOffset,
} from "u/options";
import SVG from "u/getSvg";

export default function Watch() {
  const { enableWeek } = useContext(Context);

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

  const totalWidth = enableTimeFormat !== false && enableWeek ? 94 : 80;
  const title1 = "Local time";
  const title2 = zones[0].name || "";

  const spacesNeeded = totalWidth - (title1.length + title2.length);
  return (
    <>
      <Grid.Section
        title={enableTimeTitle ? `${title1}${" ".repeat(spacesNeeded)}${title2}` : undefined}
        subtitle={
          enableTimeSecondaryOffset && enableTimeTitle
            ? `UTC ${enableTimeSecondaryOffset >= 0 ? "+" : ""}${enableTimeSecondaryOffset}`
            : undefined
        }
        key={"Section Time"}
      >
        <TimeDisplay time={time} enableWeek={enableWeek} />
        {!enableTimeTitle && !enableTimeSeconds && (
          <>
            <Grid.Item
              key={"Separator"}
              content={{
                value: {
                  source: SVG({ day: "" }),
                },
                tooltip: "",
              }}
              actions={<Actions global={true} />}
            />
          </>
        )}
        {enableTimeSecondary && enableTimeSecondaryOffset && (
          <TimeDisplay time={secondaryTime} enableWeek={enableWeek} />
        )}
      </Grid.Section>
    </>
  );
}

function TimeDisplay({
  time,
  enableWeek,
}: {
  time: { hours: string; minutes: string; seconds: string; period: string };
  enableWeek: boolean;
}) {
  const timeUnits = [
    { key: "hours", value: time.hours, tooltip: "Hours" },
    { key: "minutes", value: time.minutes, tooltip: "Minutes" },
    ...(enableTimeSeconds ? [{ key: "seconds", value: time.seconds, tooltip: "Seconds" }] : []),
    ...(enableTimeFormat && enableWeek ? [{ key: "period", value: time.period.toUpperCase(), tooltip: "AM/PM" }] : []),
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
      actions={<Actions global={true} />}
    />
  ));
}
