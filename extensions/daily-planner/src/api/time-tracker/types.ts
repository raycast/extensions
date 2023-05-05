import { TimeEntry, TimeEntryIdType } from "../../types";
import { SourceIdedTodoId } from "../todo-source";

// `TimeTracker` abstracts away the Toggl/Clockify implementation details. Primarily, it
// - stores default ids associated with the API key (default workspace id, user id for Clockify), and
// - transforms API response data into common types (`TimeEntry`, `TimeTrackerProjects`, `TimeTrackerTags`).
export interface TimeTracker {
  // Use `url` instead of `sourceIdedTodoId` for the following reasons:
  // - `calendarTimeTracker` needs the exact URL, which cannot easily be extracted from `sourceIdedTodoId` since
  //   `sourceIdedTodoId` and `url` has a one-to-many relationship.
  // - The use of `url` enables creation of time entries directly from time blocks.
  startTimer: (
    url: string,
    values: {
      description?: string; // shouldn't be `undefined`, but made optional to avoid TypeScript error message in `toTimeEntryValues()`
      projectName?: string; // name of a new project to be created in Toggl/Clockify
      tagNames?: string[]; // names of new tags to be created in Toggl/Clockify
    }
  ) => Promise<TimeEntry>;

  stopTimer: (timeEntry: TimeEntry) => Promise<void>;

  updateTimeEntries: (
    sourceIdedTodoId: SourceIdedTodoId,
    newValues: {
      description?: string;
      projectName?: string;
      tagNames?: string[];
    }
  ) => Promise<TimeEntryIdType[] | undefined>;

  deleteTimeEntries: (sourceIdedTodoId: SourceIdedTodoId) => Promise<TimeEntryIdType[] | undefined>;

  getTimeEntries?: (filter: {
    from?: Date;
    to?: Date;
    description?: string | null; // Use `null` to filter for Toggl time entries that have no description.
    runningTimerOnly?: boolean;
  }) => Promise<TimeEntry[]>;
}
