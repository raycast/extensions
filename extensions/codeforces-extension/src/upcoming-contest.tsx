import { MenuBarExtra, open } from "@raycast/api";
import { useCodeforces } from "./func/useCodeforces";
import { Contest } from "./types/codeforces";

export default function Command() {
  const { isLoading, result: contests } = useCodeforces<Contest[]>("contest.list", { gym: false });

  function unixTimestampToISOString(unixTimestamp: number | string | Date) {
    const date = new Date(unixTimestamp as number);
    const formattedDate = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return formattedDate;
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "dark.svg", dark: "white.svg" } }}
      tooltip="Upcoming Codeforces Contests"
    >
      <MenuBarExtra.Section title="Upcoming Contests">
        {contests
          ?.filter((item) => item.phase === "BEFORE")
          .slice()
          .reverse()
          .map((item) => {
            const startMs = (item.startTimeSeconds ?? 0) * 1000;
            const endMs = ((item.startTimeSeconds ?? 0) + (item.durationSeconds ?? 0)) * 1000;
            return (
              <MenuBarExtra.Item
                key={item.id}
                title={`${item.name.slice(0, 40)}${item.name.length > 40 ? "..." : ""}`}
                onAction={() =>
                  open(
                    `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(item.name)}&dates=${unixTimestampToISOString(
                      startMs,
                    )}/${unixTimestampToISOString(endMs)}`,
                  )
                }
                alternate={
                  <MenuBarExtra.Item
                    title={`${new Date(startMs).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} ${new Date(startMs).toLocaleDateString([], {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}`}
                  />
                }
              />
            );
          })}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
