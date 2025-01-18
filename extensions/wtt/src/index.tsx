import { MenuBarExtra } from "@raycast/api";
import { useEffect, useState } from "react";
import { TimeZoneConfig } from "./config";
import { getSavedTimeZones } from "./storage";
import { formatMenuTime, formatDropdownTime, getTimezoneCode } from "./utils";

export default function Command() {
  const [timeZones, setTimeZones] = useState<TimeZoneConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load time zones once on mount
  useEffect(() => {
    getSavedTimeZones().then((zones) => {
      setTimeZones(zones);
      setIsLoading(false);
    });
  }, []);

  // Update times every 30 seconds
  const [, setUpdateTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger((n) => n + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Create menu bar text
  const menuBarText =
    timeZones.length > 0
      ? timeZones
          .map((tz) => `${formatMenuTime(tz.timezone)} ${tz.nickname}`)
          .join(" / ")
      : formatMenuTime(); // Show local time if no zones configured

  return (
    <MenuBarExtra title={menuBarText} isLoading={isLoading}>
      {timeZones.length > 0 ? (
        timeZones.map((tz) => (
          <MenuBarExtra.Item
            key={tz.timezone}
            title={`${tz.nickname} ${formatDropdownTime(tz.timezone)} ${getTimezoneCode(tz.timezone)}`}
          />
        ))
      ) : (
        <MenuBarExtra.Item
          title={`Local ${formatDropdownTime()} ${getTimezoneCode()}`}
        />
      )}
    </MenuBarExtra>
  );
}
