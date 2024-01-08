import {
  ActionPanel,
  List,
  Action,
  Icon,
  LocalStorage,
  showToast,
  Toast,
  getPreferenceValues,
  Image,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AddTime } from "./views/add-time";
import { EditTime } from "./views/edit-time";
import { useEffect } from "react";
import spacetime, { Spacetime } from "spacetime";
import timezoneSoft from "timezone-soft";
import { TimeEntry } from "./components/time-entry-form";

spacetime.extend(timezoneSoft);

interface Preferences {
  timezone?: string;
  timeformat?: "12" | "24";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    isLoading,
    data: times,
    revalidate,
  } = usePromise(() => {
    return new Promise<TimeEntry[]>((resolve) => {
      LocalStorage.getItem<string>("times").then((times) => {
        resolve(times ? JSON.parse(times) : []);
      });
    });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      revalidate();
    }, 1000 * 60);
    return () => clearInterval(interval);
  }, []);

  let currentTime: Spacetime;
  if (preferences.timezone) {
    currentTime = spacetime.now(preferences.timezone);
  } else {
    currentTime = spacetime.now();
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push title="Add Time" icon={Icon.AddPerson} target={<AddTime onAdd={revalidate} />} />
        </ActionPanel>
      }
    >
      {times && times.length > 0 && (
        <>
          <List.Section title="Favorites">
            {times
              .filter((time) => time.favorite)
              .sort((a, b) => a.favoritePosition - b.favoritePosition)
              .map((time) => {
                return (
                  <ListItem
                    key={time.name}
                    time={time}
                    revalidate={revalidate}
                    currentTime={currentTime}
                    times={times}
                    timeformat={preferences.timeformat}
                  />
                );
              })}
          </List.Section>

          <List.Section title="Team">
            {times
              .filter((time) => !time.favorite)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((time) => {
                return (
                  <ListItem
                    key={time.name}
                    time={time}
                    revalidate={revalidate}
                    currentTime={currentTime}
                    times={times}
                    timeformat={preferences.timeformat}
                  />
                );
              })}
          </List.Section>
        </>
      )}
    </List>
  );
}

function ListItem({
  time,
  revalidate,
  currentTime,
  times,
  timeformat = "12",
}: {
  time: TimeEntry;
  revalidate: () => void;
  currentTime: Spacetime;
  times: TimeEntry[];
  timeformat?: "12" | "24";
}) {
  const timeTz = spacetime.now(time.timezone);
  const offset = timeTz.timezone().current.offset - currentTime.timezone().current.offset;

  const differenceText =
    offset === 0 ? "has the same Time" : offset > 0 ? `is ${offset} hours ahead` : `is ${offset * -1} hours behind`;

  const formatString = timeformat === "12" ? "{hour-pad}:{minute-pad} {ampm}" : "{hour-24-pad}:{minute-pad}";

  return (
    <List.Item
      key={time.name}
      id={time.name}
      title={time.name}
      subtitle={differenceText}
      icon={{ source: time.profileImage ?? Icon.PersonCircle, mask: Image.Mask.Circle }}
      accessories={[
        {
          text: `Current time: ${timeTz.format(formatString)}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={time.name}>
            <Action.CopyToClipboard
              title="Copy Time"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              content={timeTz.format(formatString)}
            />
            <Action.Push
              title={`Edit "${time.name}"`}
              icon={Icon.Pencil}
              target={<EditTime entry={time} onEdit={revalidate} />}
            />
            <Action
              title={`Delete "${time.name}"`}
              icon={Icon.Trash}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              style={Action.Style.Destructive}
              onAction={async () => {
                const newTimes = times.filter((t: { name: string }) => t.name !== time.name);
                await LocalStorage.setItem("times", JSON.stringify(newTimes));
                showToast({
                  title: `"${time.name}" deleted`,
                  style: Toast.Style.Success,
                });
                revalidate();
              }}
            />
            {!time.favorite && (
              <Action
                title="Add to Favorites"
                icon={Icon.Star}
                shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                onAction={async () => {
                  const newTimes = times.map((t: TimeEntry) => {
                    if (t.name === time.name) {
                      t.favorite = true;
                      t.favoritePosition = times.filter((t: TimeEntry) => t.favorite).length;
                    }
                    return t;
                  });
                  await LocalStorage.setItem("times", JSON.stringify(newTimes));
                  revalidate();
                }}
              />
            )}
            {time.favorite && (
              <Action
                title="Remove from Favorites"
                icon={Icon.StarDisabled}
                shortcut={{ modifiers: ["shift", "cmd"], key: "f" }}
                onAction={async () => {
                  const newTimes = times.map((t: TimeEntry) => {
                    if (t.name === time.name) {
                      t.favorite = false;
                      t.favoritePosition = 0;
                    }
                    return t;
                  });
                  // Reorder the favorites
                  newTimes
                    .filter((t: TimeEntry) => t.favorite)
                    .sort((a: TimeEntry, b: TimeEntry) => a.favoritePosition - b.favoritePosition)
                    .forEach((t: TimeEntry, index: number) => {
                      t.favoritePosition = index + 1;
                    });

                  await LocalStorage.setItem("times", JSON.stringify(newTimes));
                  revalidate();
                }}
              />
            )}
            {time.favorite && time.favoritePosition > 1 && (
              <Action
                title="Move up in Favorites"
                icon={Icon.ArrowUp}
                shortcut={{ modifiers: ["opt", "cmd"], key: "arrowUp" }}
                onAction={async () => {
                  // Find the time that is above this one
                  const timeAbove = times.find((t: TimeEntry) => t.favoritePosition === time.favoritePosition - 1);
                  const newTimes = times.map((t: TimeEntry) => {
                    if (t.name === time.name) {
                      t.favoritePosition -= 1;
                    } else if (t.name === timeAbove?.name) {
                      t.favoritePosition += 1;
                    }
                    return t;
                  });
                  await LocalStorage.setItem("times", JSON.stringify(newTimes));
                  revalidate();
                }}
              />
            )}
            {time.favorite && time.favoritePosition < times.filter((t: TimeEntry) => t.favorite).length && (
              <Action
                title="Move down in Favorites"
                icon={Icon.ArrowDown}
                shortcut={{ modifiers: ["opt", "cmd"], key: "arrowDown" }}
                onAction={async () => {
                  // Find the time that is below this one
                  const timeBelow = times.find((t: TimeEntry) => t.favoritePosition === time.favoritePosition + 1);
                  const newTimes = times.map((t: TimeEntry) => {
                    if (t.name === time.name) {
                      t.favoritePosition += 1;
                    } else if (t.name === timeBelow?.name) {
                      t.favoritePosition -= 1;
                    }
                    return t;
                  });
                  await LocalStorage.setItem("times", JSON.stringify(newTimes));
                  revalidate();
                }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Team Time">
            <Action.Push
              title="Add Teammember"
              icon={Icon.AddPerson}
              shortcut={{
                modifiers: ["cmd"],
                key: "n",
              }}
              target={<AddTime onAdd={revalidate} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
