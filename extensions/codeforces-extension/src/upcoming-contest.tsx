/* eslint-disable @typescript-eslint/no-explicit-any */
import { MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { CODEFORCES_API_BASE } from "./constants";
import { useEffect, useState } from "react";

export default function Command() {
  const { isLoading, data, error } = useFetch(`${CODEFORCES_API_BASE}contest.list?gym=false`, {
    keepPreviousData: true,
  });

  if (error) {
    console.log(`Error while fetching details:\n${error}`);
  }

  interface Contest {
    id: number;
    name: string;
    type: string;
    phase: string;
    frozen: boolean;
    durationSeconds: number;
    startTimeSeconds: number;
    relativeTimeSeconds: number;
  }

  const [contests, setContests] = useState<Contest[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setContests((data as any).result);
    }
  }, [isLoading]);

  function unixTimestampToISOString(unixTimestamp: string | number | Date) {
    const date = new Date(unixTimestamp);
    const formattedDate = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return formattedDate;
  }

  return (
    <MenuBarExtra
      isLoading
      icon={{ source: { light: "dark.svg", dark: "white.svg" } }}
      tooltip="Upcoming Codeforces Contests"
    >
      <MenuBarExtra.Section title="Upcoming Contests">
        {contests
          .filter((item) => item.phase === "BEFORE")
          .reverse()
          .map((item) => (
            <MenuBarExtra.Item
              key={item.id}
              title={`${item.name.slice(0, 40)}${item.name.length > 40 ? "..." : ""}`}
              onAction={() =>
                open(
                  `https://calendar.google.com/calendar/u/0/r/eventedit?text=${
                    item.name
                  }&dates=${unixTimestampToISOString(item.startTimeSeconds * 1000)}/${unixTimestampToISOString(
                    (item.startTimeSeconds + item.durationSeconds) * 1000,
                  )}`,
                )
              }
              alternate={
                <MenuBarExtra.Item
                  title={`${new Date(item.startTimeSeconds * 1000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })} ${new Date(item.startTimeSeconds * 1000).toLocaleDateString([], {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}`}
                />
              }
            />
          ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
