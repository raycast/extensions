import { Color, Icon, MenuBarExtra, open } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  Assignment,
  classroomLink,
  ClassroomApi,
  dueDate,
  isPastDue,
  statusUnavailableCourses,
  submissionStatus,
} from "./lib/api";
import { accessToken, isStudent } from "./lib/auth";
import { launch } from "./lib/launch";

async function loadAssignments() {
  const api = new ClassroomApi(await accessToken());
  return api.assignments(await api.courses(), { mine: isStudent() });
}

async function openUrl(url: string) {
  try {
    await open(url);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Classroom" });
  }
}

const WEEK = 7 * 86_400_000;

export default function ClassroomMenuBar() {
  const { data, error, isLoading } = usePromise(loadAssignments, [], {
    onError: () => undefined,
  });
  const items = data?.items;
  const failures = data?.failures ?? [];
  const statusUnavailable = statusUnavailableCourses(items ?? []);
  const incomplete = failures.length > 0 || statusUnavailable.length > 0;

  const now = Date.now();
  const open_ = (items ?? []).filter((item) => {
    const status = submissionStatus(item, now);
    return status === "todo" || status === "missing" || status === "unknown";
  });
  // Teachers (and students whose status failed to load) have no "missing"
  // status, so overdue work with unknown status counts as past due.
  const missing = open_.filter((item) => isPastDue(item, now));
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
        onAction={url ? () => openUrl(url) : undefined}
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
          : incomplete
            ? Color.Orange
            : missing.length
              ? Color.Red
              : undefined,
      }}
      title={count ? String(count) : undefined}
      tooltip={
        error
          ? "Google Classroom: not connected"
          : `${upcoming.length} due this week, ${missing.length} ${isStudent() ? "missing" : "past due"}${incomplete ? " (incomplete)" : ""}`
      }
    >
      {error ? (
        <MenuBarExtra.Item
          title="Connect Google Classroom…"
          icon={Icon.Warning}
          onAction={() => launch("connect")}
        />
      ) : null}
      {incomplete ? (
        <MenuBarExtra.Section title="Incomplete">
          {failures.length ? (
            <MenuBarExtra.Item
              title={`${failures.length} ${failures.length === 1 ? "course" : "courses"} could not be loaded`}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              onAction={() => launch("assignments")}
            />
          ) : null}
          {statusUnavailable.length ? (
            <MenuBarExtra.Item
              title="Submission status unavailable"
              subtitle={statusUnavailable.join(", ")}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              onAction={() => launch("assignments")}
            />
          ) : null}
        </MenuBarExtra.Section>
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
      {!error && !isLoading && !count && !incomplete ? (
        <MenuBarExtra.Item title="All caught up 🎉" />
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Browse All Coursework…"
          icon={Icon.List}
          onAction={() => launch("assignments")}
        />
        <MenuBarExtra.Item
          title="Open Google Classroom"
          icon={Icon.Globe}
          onAction={() => openUrl("https://classroom.google.com/")}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
