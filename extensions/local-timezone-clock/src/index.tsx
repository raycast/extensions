import { LocalStorage, MenuBarExtra, updateCommandMetadata } from "@raycast/api";
import { useEffect, useState } from "react";
import { getClockEmoji } from "./utils/clocks";

export default function Command() {
  const [timezone, setTimezone] = useState<string>("UTC");
  const [clockIcon, setClockIcon] = useState<string>("🕙");

  function getCurrentTime() {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).format(new Date());
  }

  const updateMetadata = async () => {
    await updateCommandMetadata({ subtitle: `It's ${getCurrentTime()} somewhere else in the world` });
    setClockIcon(getClockEmoji(getCurrentTime()));
  };

  const fetchTimezone = async () => {
    const _timezone: string = (await LocalStorage.getItem<string>("timezoneCity")) as string;
    setTimezone(_timezone);
  };

  useEffect(() => {
    fetchTimezone();
  }, []);

  useEffect(() => {
    updateMetadata();
  }, [timezone]);

  return <MenuBarExtra icon={clockIcon} title={getCurrentTime()}></MenuBarExtra>;
}
