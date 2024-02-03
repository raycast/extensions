/* eslint-disable @typescript-eslint/no-explicit-any */
import { MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { CODEFORCES_API_BASE, CODEFORCES_BASE } from "./constants";
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
              title={item.name}
              onAction={() => open(`${CODEFORCES_BASE}contests`)}
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
