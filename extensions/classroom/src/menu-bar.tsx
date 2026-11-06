import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  Assignment,
  classroomLink,
  ClassroomApi,
  dueDate,
  submissionStatus,
} from "./lib/api";
import { accessToken, isStudent } from "./lib/auth";

const WEEK = 7 * 86_400_000;

export default function ClassroomMenuBar() {
  const [items, setItems] = useState<Assignment[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const api = new ClassroomApi(await accessToken());
      const { items } = await api.assignments(await api.courses(), {
        mine: isStudent(),
      });
      setItems(items);
    })()
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const now = Date.now();
  const open_ = (items ?? []).filter((item) => {
    const status = submissionStatus(item, now);
    return status === "todo" || status === "missing" || status === "unknown";
  });
  const missing = open_.filter(
    (item) => submissionStatus(item, now) === "missing",
  );
  const upcoming = open_
    .filter((item) => {
      const due = dueDate(item)?.getTime();
      return due !== undefined && due >= now && due - now <= WEEK;
    })
    .sort(
      (a, b) => (dueDate(a)?.getTime() ?? 0) - (dueDate(b)?.getTime() ?? 0),
    );
  const count = missing.length + upcoming.length;

  const item = (work: Assignment) => {
    const due = dueDate(work);
    const url = classroomLink(work.alternateLink);
    return (
      <MenuBarExtra.Item
        key={`${work.courseId}-${work.id}`}
        title={
          work.title.length > 48 ? `${work.title.slice(0, 47)}…` : work.title
        }
        subtitle={`${work.courseName}${due ? ` · ${due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : ""}`}
        onAction={url ? () => open(url) : undefined}
      />
    );
  };

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Book,
        tintColor: error
          ? Color.SecondaryText
          : missing.length
            ? Color.Red
            : undefined,
      }}
      title={count ? String(count) : undefined}
      tooltip={
        error
          ? "Google Classroom: not connected"
          : `${upcoming.length} due this week, ${missing.length} missing`
      }
    >
      {error ? (
        <MenuBarExtra.Item
          title="Connect Google Classroom…"
          icon={Icon.Warning}
          onAction={() =>
            launchCommand({ name: "connect", type: LaunchType.UserInitiated })
          }
        />
      ) : null}
      {missing.length ? (
        <MenuBarExtra.Section title={isStudent() ? "Missing" : "Past Due"}>
          {missing.slice(0, 10).map(item)}
        </MenuBarExtra.Section>
      ) : null}
      {upcoming.length ? (
        <MenuBarExtra.Section title="Due in the Next 7 Days">
          {upcoming.slice(0, 15).map(item)}
        </MenuBarExtra.Section>
      ) : null}
      {!error && !isLoading && !count ? (
        <MenuBarExtra.Item title="All caught up 🎉" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Browse All Coursework…"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "assignments",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Google Classroom"
          icon={Icon.Globe}
          onAction={() => open("https://classroom.google.com/")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
