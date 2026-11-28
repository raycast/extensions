import { Cache, environment } from "@raycast/api";
import { getAccountEmail, getOAuthToken } from "./googleAuth";
import { ClassroomError, createListClient, LoadOptions } from "./listClient";

const list = createListClient({
  cache: new Cache({ namespace: "classroom-lists-v1", capacity: 4 * 1024 * 1024 }),
  getToken: getOAuthToken,
  report: environment.isDevelopment
    ? (event) => console.log("[Classroom request] " + JSON.stringify(event))
    : undefined,
});

const COURSE_FIELDS =
  "id,name,section,descriptionHeading,description,room,ownerId,creationTime,updateTime,enrollmentCode,courseState,alternateLink,teacherGroupEmail,courseGroupEmail,teacherFolder,calendarId";
const POST_FIELDS = "id,courseId,alternateLink,creationTime,updateTime,creatorUserId,materials";
const WORK_FIELDS = `${POST_FIELDS},title,description,topicId,workType,dueDate,dueTime,maxPoints,multipleChoiceQuestion/choices`;
const SUBMISSION_FIELDS =
  "courseWorkId,state,late,assignedGrade,alternateLink,assignmentSubmission/attachments,shortAnswerSubmission/answer,multipleChoiceSubmission/answer";
const fields = (key: string, selection: string) => `nextPageToken,${key}(${selection})`;

export type Teacher = { userId: string; name: string; email?: string; photoUrl?: string };

export type Attachment = {
  kind: "drive" | "youtube" | "link" | "form" | "gem" | "notebook";
  title: string;
  url: string;
  // Only set for Drive files
  driveId?: string;
};

export type Course = {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId: string;
  creationTime: string;
  updateTime: string;
  enrollmentCode?: string;
  courseState: "ACTIVE" | "ARCHIVED" | "PROVISIONED" | "DECLINED" | "SUSPENDED";
  alternateLink: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  teacherFolder?: { id: string; title?: string; alternateLink?: string };
  calendarId?: string;
  teachers?: Teacher[];
};

export type Submission = {
  state: "NEW" | "CREATED" | "TURNED_IN" | "RETURNED" | "RECLAIMED_BY_STUDENT";
  late: boolean;
  assignedGrade?: number;
  url: string;
  attachments: Attachment[];
  shortAnswer?: string;
};

export type StreamItemType = "announcement" | "assignment" | "question" | "material";

export type StreamItem = {
  type: StreamItemType;
  id: string;
  courseId: string;
  title: string;
  text?: string;
  url: string;
  creationTime: string;
  updateTime: string;
  creatorUserId?: string;
  topicId?: string;
  attachments: Attachment[];
  // Only set for assignments and questions
  dueDate?: string;
  maxPoints?: number;
  choices?: string[];
  submission?: Submission;
};

export type Status = "assigned" | "missing" | "turnedIn" | "returned";

export function getStatus(item: StreamItem, now = Date.now()): Status {
  if (item.submission?.state === "TURNED_IN") return "turnedIn";
  if (item.submission?.state === "RETURNED") return "returned";
  return item.dueDate && new Date(item.dueDate).getTime() < now ? "missing" : "assigned";
}

// A part of the data that couldn't be loaded, reported next to everything that could
// `id` tells apart courses that share a name
export type Issue = { id: string; title: string; message: string };
type Options = LoadOptions & { issues?: Issue[] };

// With an `issues` collector a failure is recorded there instead of failing everything else.
// It is never turned into an empty result: "couldn't load" must not read as "nothing there".
function report(options: Options, title: string, error: unknown, id = title) {
  if (!options.issues) throw error;
  if (options.issues.some((issue) => issue.id === id)) return;
  options.issues.push({ id, title, message: error instanceof Error ? error.message : String(error) });
}

async function attempt<T>(
  title: string,
  options: Options,
  load: () => Promise<T>,
  id?: string,
): Promise<T | undefined> {
  try {
    return await load();
  } catch (error) {
    report(options, title, error, id);
  }
}

export const newestFirst = (a: { updateTime: string }, b: { updateTime: string }) =>
  Date.parse(b.updateTime) - Date.parse(a.updateTime);

// Courses can restrict their roster, which only costs the teacher names
async function optional<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ClassroomError && (error.status === 403 || error.status === 404)) return [];
    throw error;
  }
}

type RawTeacher = {
  userId: string;
  profile?: { name?: { fullName?: string }; emailAddress?: string; photoUrl?: string };
};

export async function getTeachers(courseId: string, options: LoadOptions = {}): Promise<Teacher[]> {
  const teachers = await optional(
    list<RawTeacher>(
      `courses/${courseId}/teachers`,
      "teachers",
      {
        pageSize: "100",
        fields: fields("teachers", "userId,profile(name/fullName,emailAddress,photoUrl)"),
      },
      options,
    ),
  );
  return teachers.map(({ userId, profile }) => ({
    userId,
    name: profile?.name?.fullName ?? profile?.emailAddress ?? "Unknown",
    email: profile?.emailAddress,
    photoUrl: profile?.photoUrl?.startsWith("//") ? `https:${profile.photoUrl}` : profile?.photoUrl,
  }));
}

export async function getCourses(
  options: Options & { withTeachers?: boolean; activeOnly?: boolean } = {},
): Promise<Course[]> {
  // The roster is a detail of a course, failing to load it shouldn't cost the course
  const withTeachers = (courses: Course[]) =>
    Promise.all(
      courses.map(async (course) => ({
        ...course,
        teachers: await getTeachers(course.id, options).catch(() => undefined),
      })),
    );

  const courses = await list<Course>(
    "courses",
    "courses",
    {
      courseStates: options.activeOnly ? ["ACTIVE"] : ["ACTIVE", "ARCHIVED"],
      pageSize: "100",
      fields: fields("courses", COURSE_FIELDS),
    },
    options,
  );
  return options.withTeachers ? withTeachers(courses) : courses;
}

type RawFile = { id?: string; title?: string; alternateLink?: string };
type RawVideo = { title?: string; alternateLink?: string };
type RawApp = { title?: string; url?: string };

// The materials of a post and the attachments of a submission almost share a shape: posts wrap the Drive file
// with its share mode and spell `youtubeVideo`, submissions hold the file directly and spell `youTubeVideo`
type RawMaterial = {
  driveFile?: RawFile | { driveFile?: RawFile };
  youtubeVideo?: RawVideo;
  youTubeVideo?: RawVideo;
  link?: { url: string; title?: string };
  form?: { formUrl: string; title?: string };
  gem?: RawApp;
  notebook?: RawApp;
};

function toAttachments(materials: RawMaterial[] = []): Attachment[] {
  return materials.flatMap(({ driveFile, youtubeVideo, youTubeVideo, link, form, gem, notebook }): Attachment[] => {
    const file = driveFile && "driveFile" in driveFile ? driveFile.driveFile : (driveFile as RawFile | undefined);
    if (file?.id) {
      const url = file.alternateLink ?? `https://drive.google.com/open?id=${file.id}`;
      return [{ kind: "drive", title: file.title ?? "Untitled", url, driveId: file.id }];
    }
    const video = youtubeVideo ?? youTubeVideo;
    if (video?.alternateLink) {
      return [{ kind: "youtube", title: video.title ?? "YouTube Video", url: video.alternateLink }];
    }
    if (link) return [{ kind: "link", title: link.title ?? link.url, url: link.url }];
    if (form) return [{ kind: "form", title: form.title ?? "Google Form", url: form.formUrl }];
    if (gem?.url) return [{ kind: "gem", title: gem.title ?? "Gemini Gem", url: gem.url }];
    if (notebook?.url) return [{ kind: "notebook", title: notebook.title ?? "NotebookLM Notebook", url: notebook.url }];
    return [];
  });
}

type RawPost = {
  id: string;
  courseId: string;
  title?: string;
  text?: string;
  description?: string;
  materials?: RawMaterial[];
  alternateLink: string;
  creationTime: string;
  updateTime: string;
  creatorUserId?: string;
  topicId?: string;
  workType?: "ASSIGNMENT" | "SHORT_ANSWER_QUESTION" | "MULTIPLE_CHOICE_QUESTION";
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number; seconds?: number; nanos?: number };
  maxPoints?: number;
  multipleChoiceQuestion?: { choices?: string[] };
};

type RawSubmission = {
  courseWorkId: string;
  state: Submission["state"];
  late?: boolean;
  assignedGrade?: number;
  alternateLink: string;
  assignmentSubmission?: { attachments?: RawMaterial[] };
  shortAnswerSubmission?: { answer?: string };
  multipleChoiceSubmission?: { answer?: string };
};

function toStreamItem(post: RawPost, type: StreamItemType, submission?: RawSubmission): StreamItem {
  const text = post.text ?? post.description;
  const firstLine = text?.trim().split("\n")[0] ?? "";
  // The due date and time are in UTC, and zero values are omitted
  const { dueDate, dueTime } = post;
  const attachments = toAttachments(post.materials);
  // Only announcements have no title of their own, and theirs can be nothing but attachments
  const fallbackTitle =
    (firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine) || attachments[0]?.title || "Announcement";

  return {
    type,
    id: post.id,
    courseId: post.courseId,
    title: post.title ?? fallbackTitle,
    text,
    url: post.alternateLink,
    creationTime: post.creationTime,
    updateTime: post.updateTime,
    creatorUserId: post.creatorUserId,
    topicId: post.topicId,
    attachments,
    dueDate:
      dueDate &&
      new Date(
        Date.UTC(
          dueDate.year,
          dueDate.month - 1,
          dueDate.day,
          dueTime?.hours ?? 0,
          dueTime?.minutes ?? 0,
          dueTime?.seconds ?? 0,
          (dueTime?.nanos ?? 0) / 1e6,
        ),
      ).toISOString(),
    maxPoints: post.maxPoints,
    choices: post.multipleChoiceQuestion?.choices,
    submission: submission && {
      state: submission.state,
      late: submission.late ?? false,
      assignedGrade: submission.assignedGrade,
      url: submission.alternateLink,
      attachments: toAttachments(submission.assignmentSubmission?.attachments),
      shortAnswer: submission.shortAnswerSubmission?.answer ?? submission.multipleChoiceSubmission?.answer,
    },
  };
}

// Assignments and questions of a course, along with the user's submission for each.
// Fails as a whole: work shown without its submission would wrongly read as not turned in.
export async function getCourseWork(courseId: string, options: LoadOptions = {}): Promise<StreamItem[]> {
  const [courseWork, submissions] = await Promise.all([
    list<RawPost>(
      `courses/${courseId}/courseWork`,
      "courseWork",
      { pageSize: "100", fields: fields("courseWork", WORK_FIELDS) },
      options,
    ),
    // `-` fetches the submissions of all the course work at once
    list<RawSubmission>(
      `courses/${courseId}/courseWork/-/studentSubmissions`,
      "studentSubmissions",
      {
        userId: "me",
        pageSize: "100",
        fields: fields("studentSubmissions", SUBMISSION_FIELDS),
      },
      options,
    ),
  ]);

  const submissionByWork = new Map(submissions.map((submission) => [submission.courseWorkId, submission]));
  return courseWork.map((work) =>
    toStreamItem(work, work.workType === "ASSIGNMENT" ? "assignment" : "question", submissionByWork.get(work.id)),
  );
}

export type CourseStream = { items: StreamItem[]; topics: Record<string, string> };

export async function getCourseStream(courseId: string, options: Options = {}): Promise<CourseStream> {
  const [courseWork = [], announcements = [], materials = [], topics = []] = await Promise.all([
    attempt("Assignments and Questions", options, () => getCourseWork(courseId, options)),
    attempt("Announcements", options, () =>
      list<RawPost>(
        `courses/${courseId}/announcements`,
        "announcements",
        { pageSize: "100", fields: fields("announcements", `${POST_FIELDS},text`) },
        options,
      ),
    ),
    attempt("Materials", options, () =>
      list<RawPost>(
        `courses/${courseId}/courseWorkMaterials`,
        "courseWorkMaterial",
        { pageSize: "100", fields: fields("courseWorkMaterial", `${POST_FIELDS},title,description,topicId`) },
        options,
      ),
    ),
    attempt("Topics", options, () =>
      list<{ topicId: string; name: string }>(
        `courses/${courseId}/topics`,
        "topic",
        { pageSize: "100", fields: fields("topic", "topicId,name") },
        options,
      ),
    ),
  ]);

  const items = [
    ...courseWork,
    ...announcements.map((post) => toStreamItem(post, "announcement")),
    ...materials.map((post) => toStreamItem(post, "material")),
  ].sort(newestFirst);

  return { items, topics: Object.fromEntries(topics.map(({ topicId, name }) => [topicId, name])) };
}

export type Assignment = StreamItem & { course: Course };

// The IDs of the active courses as of the last load, so that the next one doesn't have to wait for the
// course list before asking for their work
const knownCourses = new Cache({ namespace: "classroom-known-courses" });

function getKnownCourseIds(): string[] {
  try {
    const ids: unknown = JSON.parse(knownCourses.get(getAccountEmail() ?? "") ?? "[]");
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

// Assignments and questions across all the active courses. Nothing is requested for the hidden ones.
export async function getAssignments(options: Options & { hiddenCourseIds?: string[] } = {}): Promise<Assignment[]> {
  const hidden = new Set(options.hiddenCourseIds);
  // Only a head start: the course list still decides what is shown, so a course that was joined or left
  // since the last load is handled as if nothing was known.
  const started = new Map<string, Promise<StreamItem[]>>();
  for (const id of getKnownCourseIds()) {
    if (hidden.has(id)) continue;
    const work = getCourseWork(id, options);
    // Handled where it is awaited below, if the course is still there
    work.catch(() => undefined);
    started.set(id, work);
  }
  // Share the same catalog with Show Courses rather than refetching an active-only variant.
  const courses = (await getCourses(options)).filter(
    (course) => course.courseState === "ACTIVE" && !hidden.has(course.id),
  );
  try {
    knownCourses.set(getAccountEmail() ?? "", JSON.stringify(courses.map((course) => course.id)));
  } catch {
    /* only costs the head start */
  }
  const courseWork = await Promise.all(
    courses.map((course) =>
      attempt(
        course.name,
        options,
        async () =>
          (await (started.get(course.id) ?? getCourseWork(course.id, options))).map((item) => ({ ...item, course })),
        course.id,
      ),
    ),
  );
  return courseWork.flatMap((items) => items ?? []);
}

// Doubles as the sections of the assignments list, in display order
export const ASSIGNMENT_GROUPS = ["missing", "dueSoon", "dueLater", "noDueDate", "done"] as const;
export type AssignmentGroup = (typeof ASSIGNMENT_GROUPS)[number];

const WEEK = 7 * 24 * 60 * 60 * 1000;

export function getAssignmentGroup(item: StreamItem, now = Date.now()): AssignmentGroup {
  const status = getStatus(item, now);
  if (status === "missing") return "missing";
  if (status !== "assigned") return "done";
  if (!item.dueDate) return "noDueDate";
  return new Date(item.dueDate).getTime() - now <= WEEK ? "dueSoon" : "dueLater";
}

export type AssignmentFilter = "all" | "due" | Exclude<AssignmentGroup, "dueLater">;

export function matchesFilter(item: StreamItem, filter: AssignmentFilter, now = Date.now()): boolean {
  const group = getAssignmentGroup(item, now);
  if (filter === "all") return true;
  // Everything with a due date that still has to be turned in
  if (filter === "due") return group === "dueSoon" || group === "dueLater";
  return group === filter;
}
