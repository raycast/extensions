import { Cache, Icon } from "@raycast/api";
import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { DetailedTodo, Todo, UniversalListKey } from "../../types";
import { DAY, localToUTC, MONTH, startOfTomorrowUTC, utcToLocal, YEAR } from "./datetime";
import { QueryFilter, ThingsDetailedTask, ThingsTask, TodoSourceList } from "./types";

type ThingsList = "inbox" | "today" | "upcoming" | "anytime" | "someday" | "logbook";

export const THINGS_SOURCE_ID = "t";

// `id` is used in AppleScript to move to-dos and must start with an uppercase letter.
export const thingsList: Record<ThingsList, TodoSourceList> = {
  inbox: { type: "list", id: "Inbox", title: "Inbox", icon: Icon.Tray },
  today: { type: "list", id: "Today", title: "Today", isToday: true, icon: Icon.Star },
  upcoming: {
    type: "list",
    id: "Upcoming",
    title: "Upcoming",
    icon: { light: "light/calendar-alt.svg", dark: "dark/calendar-alt.svg" },
  },
  anytime: {
    type: "list",
    id: "Anytime",
    title: "Anytime",
    icon: { light: "light/square-stack.svg", dark: "dark/square-stack.svg" },
  },
  someday: {
    type: "list",
    id: "Someday",
    title: "Someday",
    icon: { light: "light/archive-box.svg", dark: "dark/archive-box.svg" },
  },
  logbook: {
    type: "list",
    id: "Logbook",
    title: "Logbook",
    icon: { light: "light/logbook.svg", dark: "dark/logbook.svg" },
  },
} as const;

type ThingsListId = (typeof thingsList)[keyof typeof thingsList]["id"];

export const THINGS_URL_PREFIX = "things:///show?id=";

const baseDir = resolve(homedir(), "Library/Group Containers/JLMPQHK86H.com.culturedcode.ThingsMac/");
const dbSubdirPrefix = "ThingsData-";
const dbSubpath = "Things Database.thingsdatabase/main.sqlite";
const dbPathCacheKey = "things-db-path";

// Limit on the # of projects may lead to an incomplete id-title mapping table and cause errors.
// `start = 1` removed from WHERE to fetch "Someday" projects.
// - Dropdowns will show more projects than what the user sees on the sidebar.
// - But "Someday" projects show up as "Move" destinations in Things when searched.
// - Without these "Someday" projects, "Anytime" (`start = 1`) tasks that belong to them won't have subtitles in lists.
export const todoGroupsQuery = `
SELECT
  'area' AS type,
  uuid AS id,
  title,
  NULL AS parentId,
  [index]
FROM
  TMArea

UNION ALL

SELECT
  'project' AS type,
  uuid AS id,
  title,
  area AS parentId,
  [index]
FROM
  TMTask
WHERE
  trashed = 0
  AND type = 1
  AND status = 0

ORDER BY
  parentId,
  type DESC,
  [index] ASC`;

export const tagsQuery = `
SELECT
  uuid AS id,
  title AS name
FROM
  TMTag
ORDER BY
  [index] ASC`;

const startOfTomorrowUTCScaled = startOfTomorrowUTC * 1e-3;
const startOfTomorrowUpdatedSchema = (YEAR << 16) | ((MONTH + 1) << 12) | ((DAY + 1) << 7);

const listWhere: Record<ThingsListId, string> = {
  [thingsList.inbox.id]: "TMTask.status = 0 AND TMTask.start = 0",
  [thingsList.today.id]: `TMTask.status = 0 AND TMTask.startDate < $STARTOFTOMORROW$`,
  [thingsList.upcoming.id]: `TMTask.status = 0
  AND (
    TMTask.startDate >= $STARTOFTOMORROW$
    OR TMTask.$DEADLINE$ >= $STARTOFTOMORROW$
  )`,
  [thingsList.anytime.id]: "TMTask.status = 0 AND TMTask.start = 1 AND TMTask.startDate ISNULL",
  [thingsList.someday.id]: "TMTask.status = 0 AND TMTask.start = 2 AND TMTask.startDate ISNULL",
  [thingsList.logbook.id]: "TMTask.status IN (2,3)", // 2: canceled, 3: completed
};

const listOrderBy: Record<ThingsListId, string> = {
  [thingsList.inbox.id]: "TMTask.[index] ASC",
  [thingsList.today.id]: "TMTask.todayIndex ASC",
  [thingsList.upcoming.id]: "ifnull(TMTask.startDate, TMTask.$DEADLINE$) ASC",
  [thingsList.anytime.id]: "TMTask.[index] ASC",
  [thingsList.someday.id]: "TMTask.[index] ASC",
  [thingsList.logbook.id]: "TMTask.stopDate DESC",
};

const universalListEquivalent: Record<UniversalListKey, ThingsListId> = {
  today: thingsList.today.id,
  upcoming: thingsList.upcoming.id,
};

const defaultLimit = 1000; // Prevent "JS heap out of memory"

let dbPath: string | undefined = undefined;

let isUpdatedSchema = false;

function findThingsDBPath(): string {
  // From Things for Mac 3.17.4 (released Apr 11, 2023), the database file is located under a directory whose name ends
  // with a random combination of alphanumeric characters.
  const subpaths = readdirSync(baseDir, "utf8");
  for (const subpath of subpaths) {
    if (subpath.startsWith(dbSubdirPrefix) && statSync(join(baseDir, subpath)).isDirectory()) {
      return join(baseDir, subpath, dbSubpath);
    }
  }
  const oldPath = join(baseDir, dbSubpath);
  if (!existsSync(oldPath)) {
    throw new Error("Things database not found");
  }
  return join(baseDir, dbSubpath);
}

export function getThingsDBPath(): string {
  if (!dbPath) {
    const cache = new Cache();
    const cachedPath = cache.get(dbPathCacheKey);
    if (cachedPath && existsSync(cachedPath)) {
      dbPath = cachedPath;
    } else {
      const path = findThingsDBPath();
      cache.set(dbPathCacheKey, path);
      dbPath = path;
    }
    isUpdatedSchema = dbPath.startsWith(join(baseDir, dbSubdirPrefix));
  }
  return dbPath;
}

function encodeDate(date: Date): number {
  return isUpdatedSchema
    ? (date.getFullYear() << 16) | ((date.getMonth() + 1) << 12) | (date.getDate() << 7)
    : localToUTC(date) * 1e-3;
}

// https://github.com/thingsapi/things.py/issues/98
function decodeDate(timeValue: number): Date {
  if (isUpdatedSchema) {
    const ymd = timeValue >>> 7;
    const d = ymd & 0b11111;
    const ym = ymd >>> 5;
    const m = ym & 0b1111;
    const y = ym >>> 4;
    return new Date(y, m - 1, d);
  }
  return utcToLocal(new Date(timeValue * 1_000));
}

// type: 0 for tasks, 1 for projects, 2 for heading
function taskQuery(whereRaw: string, orderByRaw: string, forDetail?: boolean, limit?: number): string {
  // `TMTask.dueDate` and `TMTask.actionGroup` were renamed to `TMTask.deadline` and `TMTask.heading`, respectively,
  // with the release of Things for Mac 3.17.4.
  const deadline = isUpdatedSchema ? "deadline" : "dueDate";
  const heading = isUpdatedSchema ? "heading" : "actionGroup";
  const startOfTomorrow = (isUpdatedSchema ? startOfTomorrowUpdatedSchema : startOfTomorrowUTCScaled).toString();

  const where = whereRaw.replaceAll("$DEADLINE$", deadline).replaceAll("$STARTOFTOMORROW$", startOfTomorrow);
  const orderBy = orderByRaw.replaceAll("$DEADLINE$", deadline);

  return `
WITH action_group_data AS (
  SELECT
    uuid,
    project
  FROM
    TMTask
  WHERE
    type = 2
),
concatenated_tag_data AS (
  SELECT
    group_concat(tags) AS concatenatedTagIds,
    tasks AS task_uuid
  FROM
    TMTaskTag
  GROUP BY
    tasks
)${
    forDetail
      ? `,
ordered_checklist_item_data AS (
  SELECT
    iif(status = 3, '- [x] ', '- [ ] ') || title AS markdown_list_item,
    task
  FROM
    TMChecklistItem
  ORDER BY
    [index]
),
concatenated_checklist_item_data AS (
  SELECT
    group_concat(markdown_list_item, '\n') AS concatenatedChecklistItems,
    task
  FROM
    ordered_checklist_item_data
  GROUP BY
    task
)`
      : ""
  }
SELECT
  TMTask.uuid AS id,
  ifnull(TMTask.title, 'NULL') AS title,
  TMTask.status,
  TMTask.startDate,
  TMTask.${deadline} AS dueDate,
  TMTask.stopDate,
  CASE
    WHEN TMTask.${heading} NOTNULL OR TMTask.project NOTNULL THEN 'project'
    WHEN TMTask.area NOTNULL THEN 'area'
  END AS parentType,
  coalesce(action_group_data.project,TMTask.project,TMTask.area) AS parentId,
  concatenated_tag_data.concatenatedTagIds${
    forDetail
      ? `,
  TMTask.notes,
  concatenated_checklist_item_data.concatenatedChecklistItems`
      : ""
  }
FROM
  TMTask
LEFT OUTER JOIN
  concatenated_tag_data ON concatenated_tag_data.task_uuid = TMTask.uuid
LEFT OUTER JOIN
  action_group_data ON action_group_data.uuid = TMTask.${heading}${
    forDetail
      ? `
LEFT OUTER JOIN
  concatenated_checklist_item_data ON concatenated_checklist_item_data.task = TMTask.uuid`
      : ""
  }
WHERE
  TMTask.trashed = 0
  AND TMTask.type = 0
  AND ${where}
ORDER BY
  ${orderBy}
LIMIT ${limit ?? defaultLimit}`;
}

export function getThingsTodoQuery({ todoIds, listId, interval, forDetail }: QueryFilter): string {
  if (todoIds) {
    const where = `id IN (${todoIds.map((id) => "'" + id + "'").join(",")})`;
    const orderBy = "TMTask.todayIndex ASC, TMTask.[index] ASC";
    const limit = todoIds.length;
    return taskQuery(where, orderBy, forDetail, limit);
  }

  if (listId) {
    const id = listId in universalListEquivalent ? universalListEquivalent[listId as UniversalListKey] : listId;
    const where = listWhere[id];
    const orderBy = listOrderBy[id];
    return taskQuery(where, orderBy, forDetail);
  }

  if (interval) {
    const { start: start, end } = interval;
    const startScaled = start * 1e-3;
    const endScaled = end * 1e-3;
    const startDateOnly = encodeDate(new Date(start));
    const endDateOnly = encodeDate(new Date(end));

    const where = `(
    TMTask.stopDate BETWEEN ${startScaled} AND ${endScaled}
    OR (
      TMTask.startDate <= ${endDateOnly}
      AND (
        TMTask.startDate > ${startDateOnly}
        OR TMTask.status = 0
      )
    )
  )`;
    const orderBy = "TMTask.stopDate ASC NULLS LAST, TMTask.startDate ASC NULLS LAST, TMTask.[index] ASC";
    return taskQuery(where, orderBy, forDetail);
  }

  return "";
}

export function parseThingsTask(task: ThingsTask): Todo {
  return {
    sourceId: THINGS_SOURCE_ID,
    todoId: task.id,
    url: THINGS_URL_PREFIX + task.id,
    title: task.title,
    status: task.status,
    startDate: task.startDate ? decodeDate(task.startDate) : null,
    dueDate: task.dueDate ? decodeDate(task.dueDate) : null,
    completionDate: task.stopDate ? new Date(task.stopDate * 1_000) : null,
    group:
      task.parentType && task.parentId
        ? {
            type: task.parentType,
            id: task.parentId,
          }
        : null,
    tagIds: task.concatenatedTagIds ? task.concatenatedTagIds.split(",") : null,
  };
}

export function parseThingsDetailedTask(task: ThingsDetailedTask): DetailedTodo {
  const todo = parseThingsTask(task);

  return {
    ...todo,
    notes: task.notes ?? null,
    concatenatedChecklistItems: task.concatenatedChecklistItems ?? null,
  };
}
