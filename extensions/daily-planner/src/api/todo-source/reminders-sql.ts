import { Cache, Color, Icon } from "@raycast/api";
import { existsSync, readdirSync, statSync } from "fs";
import { homedir } from "os";
import { extname, join, resolve } from "path";
import { DetailedTodo, Todo, TodoStatus, UniversalListKey } from "../../types";
import { localToUTC, startOfTomorrow, startOfTomorrowUTC, utcToLocal } from "./datetime";
import { DetailedReminder, QueryFilter, Reminder, TodoSourceList } from "./types";

type RemindersList = "today" | "scheduled" | "all" | "flagged" | "completed";

export const REMINDERS_SOURCE_ID = "r";

export const remindersList: Record<RemindersList, TodoSourceList> = {
  today: { type: "list", id: "reminders-today", title: "Today", isToday: true, icon: Icon.Star },
  scheduled: {
    type: "list",
    id: "reminders-scheduled",
    title: "Scheduled",
    icon: { light: "light/calendar-alt.svg", dark: "dark/calendar-alt.svg" },
  },
  all: { type: "list", id: "reminders-all", title: "All", icon: Icon.Tray },
  flagged: { type: "list", id: "reminders-flagged", title: "Flagged", icon: Icon.Flag },
  completed: { type: "list", id: "reminders-completed", title: "Completed", icon: Icon.CheckCircle },
} as const;

type RemindersListId = (typeof remindersList)[keyof typeof remindersList]["id"];

export const REMINDERS_URL_PREFIX = "x-apple-reminderkit://REMCDReminder/";

export const remindersPriorities = {
  1: { name: "High", color: Color.Red, icon: Icon.Exclamationmark3 },
  5: { name: "Medium", color: Color.Orange, icon: Icon.Exclamationmark2 },
  9: { name: "Low", color: Color.Yellow, icon: Icon.Exclamationmark },
  0: { name: "None", color: Color.SecondaryText, icon: Icon.Dot },
};

const baseDir = resolve(homedir(), "Library/Reminders/Container_v1/Stores/");
const dbPathCacheKey = "reminders-db-path";

export const listsQuery = `
WITH list_ent AS (
  SELECT Z_ENT
  FROM Z_PRIMARYKEY
  WHERE Z_NAME = 'REMCDList'
  LIMIT 1
),
list_data AS (
  SELECT
    Z_PK,
    (ZDAISIMMUTABLE == 1 OR ZDAISREADONLY == 1 OR ZISGROUP == 1) AS isLocked,
    ZPARENTLIST,
    Z_FOK_PARENTACCOUNT,
    ZCKIDENTIFIER,
    ZNAME2
  FROM
    ZREMCDOBJECT
  WHERE
    Z_ENT IN list_ent
    AND ZMARKEDFORDELETION = 0
)
SELECT
  'project' AS type,
  list_data.ZCKIDENTIFIER AS id,
  list_data.ZNAME2 AS title,
  list_data.isLocked AS isLocked,
  parent_list_data.ZCKIDENTIFIER AS parentId
FROM
  list_data
LEFT OUTER JOIN
  list_data AS parent_list_data ON list_data.ZPARENTLIST = parent_list_data.Z_PK
ORDER BY
  list_data.Z_FOK_PARENTACCOUNT ASC`;

const epochToRef = 978307200;

const toTimeIntervalSinceReferenceDate = (timeValue: number) => timeValue * 1e-3 - epochToRef;
const toJavaScriptDate = (timeIntervalSinceReferenceDate: number) =>
  new Date((timeIntervalSinceReferenceDate + epochToRef) * 1_000);
const startOfTomorrowRef = toTimeIntervalSinceReferenceDate(startOfTomorrow);
const startOfTomorrowUTCRef = toTimeIntervalSinceReferenceDate(startOfTomorrowUTC);

const listWhere: Record<RemindersListId, string> = {
  [remindersList.today.id]: `ZREMCDREMINDER.ZCOMPLETED = 0
  AND (
    ZREMCDREMINDER.ZDUEDATE < iif(ZREMCDREMINDER.ZALLDAY = 0, ${startOfTomorrowRef}, ${startOfTomorrowUTCRef})
    OR ZREMCDREMINDER.ZSTARTDATE < iif(ZREMCDREMINDER.ZALLDAY = 0, ${startOfTomorrowRef}, ${startOfTomorrowUTCRef})
  )`,
  [remindersList.scheduled.id]: "ZREMCDREMINDER.ZCOMPLETED = 0 AND ZREMCDREMINDER.ZDUEDATE NOTNULL",
  [remindersList.all.id]: "ZREMCDREMINDER.ZCOMPLETED = 0",
  [remindersList.flagged.id]: "ZREMCDREMINDER.ZCOMPLETED = 0 AND ZREMCDREMINDER.ZFLAGGED = 1",
  [remindersList.completed.id]: "ZREMCDREMINDER.ZCOMPLETED = 1",
};

const listOrderBy: Record<RemindersListId, string> = {
  [remindersList.today.id]: "ZREMCDREMINDER.ZDUEDATE ASC, ZREMCDREMINDER.Z_FOK_LIST ASC",
  [remindersList.scheduled.id]: "ZREMCDREMINDER.ZDUEDATE ASC",
  [remindersList.all.id]: "ZREMCDREMINDER.ZLIST ASC, ZREMCDREMINDER.Z_FOK_LIST ASC",
  [remindersList.flagged.id]: "ZREMCDREMINDER.ZCREATIONDATE ASC",
  [remindersList.completed.id]: "ZREMCDREMINDER.ZCOMPLETIONDATE DESC",
};

const universalListWhere: Record<UniversalListKey, string> = {
  today: listWhere[remindersList.today.id],
  upcoming: `ZREMCDREMINDER.ZCOMPLETED = 0
  AND ZREMCDREMINDER.ZDUEDATE >= iif(ZREMCDREMINDER.ZALLDAY = 0, ${startOfTomorrowRef}, ${startOfTomorrowUTCRef})`,
};

const defaultLimit = 2000;

let dbPath: string | undefined = undefined;

function findRemindersDBPath(): string {
  const subpaths = readdirSync(baseDir, "utf8");
  let maxFileSize = 0;
  let remindersDBPath = "";
  for (const file of subpaths) {
    if (extname(file) === ".sqlite") {
      const path = join(baseDir, file);
      const fileSize = statSync(path).size;
      if (fileSize > maxFileSize) {
        maxFileSize = fileSize;
        remindersDBPath = path;
      }
    }
  }
  if (maxFileSize === 0 || remindersDBPath === "") {
    throw new Error("Reminders database not found");
  }
  return remindersDBPath;
}

export function getRemindersDBPath(): string {
  if (!dbPath) {
    const cache = new Cache();
    const cachedPath = cache.get(dbPathCacheKey);
    if (cachedPath && existsSync(cachedPath)) {
      dbPath = cachedPath;
    } else {
      const path = findRemindersDBPath();
      cache.set(dbPathCacheKey, path);
      dbPath = path;
    }
  }
  return dbPath;
}

function reminderQuery(where: string, orderBy?: string, additionalFields?: string, limit?: number): string {
  return `
WITH tags AS (
  SELECT
    ZREMINDER3,
    group_concat(ZNAME1) AS joinedTagNames
  FROM
    ZREMCDOBJECT
  WHERE
    ZHASHTAGLABEL NOTNULL
  GROUP BY
    ZREMINDER3
),
child_reminder AS (
  SELECT
    ZPARENTREMINDER,
    group_concat(ZCKIDENTIFIER) AS joinedSubtaskIds
  FROM
    ZREMCDREMINDER
  GROUP BY
    ZPARENTREMINDER
)
SELECT
  ZREMCDREMINDER.ZCKIDENTIFIER AS id,
  ZREMCDREMINDER.ZTITLE AS title,
  ZREMCDREMINDER.ZCOMPLETED AS completed,
  ZREMCDREMINDER.ZSTARTDATE AS startDate,
  ZREMCDREMINDER.ZDUEDATE AS dueDate,
  ZREMCDREMINDER.ZALLDAY AS allDay,
  ZREMCDREMINDER.ZCOMPLETIONDATE AS completionDate,
  ZREMCDREMINDER.ZPRIORITY AS priority,
  ZREMCDOBJECT.ZCKIDENTIFIER AS listId,
  tags.joinedTagNames,
  child_reminder.joinedSubtaskIds${additionalFields ?? ""}
FROM
  ZREMCDREMINDER
INNER JOIN
  ZREMCDOBJECT ON ZREMCDREMINDER.ZLIST = ZREMCDOBJECT.Z_PK
LEFT OUTER JOIN
  tags ON ZREMCDREMINDER.Z_PK = tags.ZREMINDER3
LEFT OUTER JOIN
  child_reminder ON ZREMCDREMINDER.Z_PK = child_reminder.ZPARENTREMINDER
WHERE
  ZREMCDREMINDER.ZMARKEDFORDELETION = 0
  AND ZREMCDOBJECT.ZMARKEDFORDELETION = 0
  AND ${where}
ORDER BY
  ${orderBy ?? "ZREMCDREMINDER.Z_FOK_LIST ASC"}
LIMIT ${limit ?? defaultLimit}`;
}

function todoIdWhere(todoIds: string[]): string {
  return `id IN (${todoIds.map((id) => "'" + id + "'").join(",")})`;
}

export function getRemindersTodoQuery({ todoIds, listId, interval, forDetail }: QueryFilter): string {
  const detailFields = forDetail
    ? `,
  ZREMCDREMINDER.ZNOTES AS notes`
    : undefined;

  if (todoIds) {
    const where = todoIdWhere(todoIds);
    const limit = todoIds.length;
    return reminderQuery(where, undefined, detailFields, limit);
  }

  if (listId) {
    const where = listId in universalListWhere ? universalListWhere[listId as UniversalListKey] : listWhere[listId];
    const orderBy = listOrderBy[listId];
    return reminderQuery(where, orderBy, detailFields);
  }

  if (interval) {
    const { start: start, end } = interval;
    const startRef = toTimeIntervalSinceReferenceDate(start);
    const endRef = toTimeIntervalSinceReferenceDate(end);
    const startUTCRef = toTimeIntervalSinceReferenceDate(localToUTC(new Date(start)));
    const endUTCRef = toTimeIntervalSinceReferenceDate(localToUTC(new Date(end)));

    const where = `(
      ZREMCDREMINDER.ZCOMPLETIONDATE BETWEEN ${startRef} AND ${endRef}
      OR (
        ZREMCDREMINDER.ZDUEDATE <= iif(ZREMCDREMINDER.ZALLDAY = 0, ${endRef}, ${endUTCRef})
        AND (
          ZREMCDREMINDER.ZDUEDATE > iif(ZREMCDREMINDER.ZALLDAY = 0, ${startRef}, ${startUTCRef})
          OR ZREMCDREMINDER.ZCOMPLETED = 0
        )
      )
    )`;
    const orderBy =
      "ZREMCDREMINDER.ZCOMPLETIONDATE ASC NULLS LAST, ZREMCDREMINDER.ZDUEDATE ASC NULLS LAST, ZREMCDREMINDER.Z_FOK_LIST ASC";
    return reminderQuery(where, orderBy, detailFields);
  }

  return "";
}

export function parseReminder({
  id,
  title,
  completed,
  startDate,
  dueDate,
  allDay,
  completionDate,
  priority,
  listId,
  joinedTagNames,
  joinedSubtaskIds,
}: Reminder): Todo | DetailedTodo {
  // Date-only time values (i.e., `ZALLDAY = 1`) are in UTC.
  const convertDate: (n: number) => Date =
    !dueDate || allDay === 1 ? (n) => utcToLocal(toJavaScriptDate(n)) : (n) => toJavaScriptDate(n);

  return {
    sourceId: REMINDERS_SOURCE_ID,
    todoId: id,
    url: REMINDERS_URL_PREFIX + id,
    title,
    status: completed === 1 ? TodoStatus.completed : TodoStatus.open,
    startDate: startDate ? convertDate(startDate) : null,
    dueDate: dueDate ? convertDate(dueDate) : null,
    completionDate: completionDate ? toJavaScriptDate(completionDate) : null,
    priority,
    group: {
      type: "project",
      id: listId,
    },
    tagIds: joinedTagNames?.split(","),
    childIds: joinedSubtaskIds?.split(","),
  };
}

export function parseDetailedReminder(reminder: DetailedReminder): DetailedTodo {
  const todo = parseReminder(reminder);

  return {
    ...todo,
    notes: reminder.notes,
  };
}

export function extractRemindersTodoId(url: string): string | null {
  return url.startsWith(REMINDERS_URL_PREFIX) ? url.slice(REMINDERS_URL_PREFIX.length) : null;
}
