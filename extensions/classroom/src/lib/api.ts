export type Course = {
  id: string;
  name: string;
  section?: string;
  room?: string;
  description?: string;
  alternateLink?: string;
  courseState?: string;
};

export type Coursework = {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  alternateLink?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: {
    hours?: number;
    minutes?: number;
    seconds?: number;
    nanos?: number;
  };
  workType?: string;
  state?: string;
  maxPoints?: number;
};

export type SubmissionState =
  | "NEW"
  | "CREATED"
  | "TURNED_IN"
  | "RETURNED"
  | "RECLAIMED_BY_STUDENT"
  | "SUBMISSION_STATE_UNSPECIFIED";

export type StudentSubmission = {
  id: string;
  courseWorkId: string;
  state?: SubmissionState;
  late?: boolean;
  assignedGrade?: number;
  draftGrade?: number;
  alternateLink?: string;
};

/** Student view: your own submission. Teacher view: aggregate counts. */
export type SubmissionSummary =
  | {
      kind: "mine";
      state?: SubmissionState;
      late: boolean;
      grade?: number;
      link?: string;
    }
  | {
      kind: "class";
      turnedIn: number;
      returned: number;
      total: number;
      late: number;
    };

export type Assignment = Coursework & {
  courseName: string;
  submission?: SubmissionSummary;
};

export type Status =
  "done" | "graded" | "missing" | "late" | "todo" | "unknown";

/** A simple status for a student's own submission. */
export function submissionStatus(item: Assignment, now = Date.now()): Status {
  const sub = item.submission;
  if (!sub || sub.kind !== "mine") return "unknown";
  if (sub.state === "RETURNED")
    return sub.grade !== undefined ? "graded" : "done";
  if (sub.state === "TURNED_IN") return sub.late ? "late" : "done";
  const due = dueDate(item)?.getTime();
  if (due !== undefined && due < now) return "missing";
  return "todo";
}

export function summarize(
  submissions: StudentSubmission[],
  mine: boolean,
): Map<string, SubmissionSummary> {
  const result = new Map<string, SubmissionSummary>();
  for (const sub of submissions) {
    if (!sub || typeof sub.courseWorkId !== "string") continue;
    if (mine) {
      result.set(sub.courseWorkId, {
        kind: "mine",
        state: sub.state,
        late: Boolean(sub.late),
        grade:
          typeof sub.assignedGrade === "number" ? sub.assignedGrade : undefined,
        link: classroomLink(sub.alternateLink),
      });
      continue;
    }
    const current = result.get(sub.courseWorkId);
    const summary =
      current?.kind === "class"
        ? current
        : {
            kind: "class" as const,
            turnedIn: 0,
            returned: 0,
            total: 0,
            late: 0,
          };
    summary.total++;
    if (sub.state === "TURNED_IN") summary.turnedIn++;
    if (sub.state === "RETURNED") summary.returned++;
    if (sub.late) summary.late++;
    result.set(sub.courseWorkId, summary);
  }
  return result;
}
export type CourseworkFailure = {
  courseId: string;
  course: string;
  message: string;
};
type Fetcher = typeof fetch;

export function dueDate(work: Coursework): Date | undefined {
  if (!work.dueDate) return undefined;
  const { year, month, day } = work.dueDate;
  // Classroom's dueDate and dueTime are both specified in UTC.
  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      work.dueTime?.hours ?? 0,
      work.dueTime?.minutes ?? 0,
      work.dueTime?.seconds ?? 0,
    ),
  );
}

export function classroomLink(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      url.hostname === "classroom.google.com" &&
      !url.username &&
      !url.password
    )
      return url.href;
  } catch {
    /* Invalid links are omitted. */
  }
}

export class ClassroomApi {
  constructor(
    private token: string,
    private fetcher: Fetcher = fetch,
  ) {}

  private async page<T>(path: string, query: URLSearchParams): Promise<T> {
    const response = await this.fetcher(
      `https://classroom.googleapis.com/v1/${path}?${query}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
        redirect: "error",
      },
    );
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "Google authorization expired. Run Connect Google Classroom again.",
        403: "Google denied access. Check Classroom API enablement, account permissions, and the selected role's read-only scopes.",
        404: "This course or assignment is no longer available.",
        429: "Google's request limit was reached. Wait a moment, then refresh.",
      };
      throw new Error(
        messages[response.status] ??
          `Google Classroom request failed (${response.status}).`,
      );
    }
    return response.json() as Promise<T>;
  }

  private async collect<T>(
    path: string,
    field: string,
    query: URLSearchParams,
  ): Promise<T[]> {
    const result: T[] = [];
    const seen = new Set<string>();
    for (let page = 0; page < 200; page++) {
      const body = await this.page<Record<string, unknown>>(path, query);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("Google Classroom returned an unexpected response.");
      const items = body[field];
      if (items !== undefined && !Array.isArray(items))
        throw new Error("Google Classroom returned an unexpected response.");
      result.push(...((items ?? []) as T[]));
      const next = body.nextPageToken;
      if (!next) return result;
      if (typeof next !== "string" || seen.has(next))
        throw new Error(
          "Google Classroom returned a repeated or invalid page token.",
        );
      seen.add(next);
      query.set("pageToken", next);
    }
    throw new Error(
      "Google Classroom returned too many pages. Narrow the course selection.",
    );
  }

  async courses(state = "ACTIVE"): Promise<Course[]> {
    const courses = await this.collect<Course>(
      "courses",
      "courses",
      new URLSearchParams({ pageSize: "100", courseStates: state }),
    );
    if (
      courses.some(
        (course) =>
          !course ||
          typeof course.id !== "string" ||
          typeof course.name !== "string",
      )
    )
      throw new Error("Google Classroom returned an invalid course.");
    return courses;
  }

  async coursework(course: Course): Promise<Assignment[]> {
    const items = await this.collect<Coursework>(
      `courses/${encodeURIComponent(course.id)}/courseWork`,
      "courseWork",
      new URLSearchParams({ pageSize: "100", courseWorkStates: "PUBLISHED" }),
    );
    return items.map((work) => {
      if (
        !work ||
        typeof work.id !== "string" ||
        typeof work.courseId !== "string" ||
        typeof work.title !== "string"
      )
        throw new Error("Google Classroom returned invalid coursework.");
      return { ...work, courseName: course.name };
    });
  }

  /** Submissions for every coursework item in a course, in one paged request. */
  async submissions(
    course: Course,
    mine: boolean,
  ): Promise<StudentSubmission[]> {
    const query = new URLSearchParams({ pageSize: "300" });
    if (mine) query.set("userId", "me");
    return this.collect<StudentSubmission>(
      `courses/${encodeURIComponent(course.id)}/courseWork/-/studentSubmissions`,
      "studentSubmissions",
      query,
    );
  }

  /** Coursework plus submission status; submission failures never hide coursework. */
  async courseworkWithStatus(
    course: Course,
    mine: boolean,
  ): Promise<Assignment[]> {
    const [items, submissions] = await Promise.all([
      this.coursework(course),
      this.submissions(course, mine).catch(() => undefined),
    ]);
    if (!submissions) return items;
    const byWork = summarize(submissions, mine);
    return items.map((item) => ({ ...item, submission: byWork.get(item.id) }));
  }

  async assignments(
    courses: Course[],
    options: { mine?: boolean } = {},
  ): Promise<{
    items: Assignment[];
    failures: CourseworkFailure[];
  }> {
    const items: Assignment[] = [];
    const failures: CourseworkFailure[] = [];
    // Four concurrent course requests keep large accounts from bursting API limits.
    for (let offset = 0; offset < courses.length; offset += 4) {
      const batch = courses.slice(offset, offset + 4);
      const results = await Promise.allSettled(
        batch.map((course) =>
          options.mine === undefined
            ? this.coursework(course)
            : this.courseworkWithStatus(course, options.mine),
        ),
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") items.push(...result.value);
        else
          failures.push({
            courseId: batch[index].id,
            course: batch[index].name,
            message:
              result.reason instanceof Error
                ? result.reason.message
                : "Coursework could not be loaded.",
          });
      });
    }
    return { items, failures };
  }
}
