import { browserFileUrl, callWs } from "./moodle";
import { collectSettled, reportPartialFailures } from "./settle";
import { BASE_URL } from "./constants";
import { htmlToMarkdown, htmlToText } from "./html";
import { Lang, resolveMlang } from "./mlang";
import type { Course } from "./courses";

interface RawForum {
  id: number;
  course: number;
  cmid: number;
  name: string;
  type: string;
}

export interface RawDiscussion {
  id: number;
  discussion: number;
  name: string;
  subject: string;
  message: string;
  userfullname: string;
  created: number;
  timemodified: number;
  attachments?: { filename: string; fileurl: string }[];
  numreplies?: number;
}

export interface Announcement {
  id: number;
  discussionId: number;
  subject: string;
  /** Markdown body. */
  message: string;
  preview: string;
  author: string;
  created: Date;
  url: string;
  courseId: number;
  courseName: string;
  attachments: { name: string; url: string }[];
}

export interface NewsForum {
  id: number;
  cmid: number;
  courseId: number;
  name: string;
}

export async function fetchNewsForums(courseIds: number[], lang: Lang): Promise<NewsForum[]> {
  if (courseIds.length === 0) return [];
  const forums = await callWs<RawForum[]>("mod_forum_get_forums_by_courses", { courseids: courseIds });
  return forums
    .filter((forum) => forum.type === "news")
    .map((forum) => ({
      id: forum.id,
      cmid: forum.cmid,
      courseId: forum.course,
      name: htmlToText(resolveMlang(forum.name, lang)),
    }));
}

export function toAnnouncement(raw: RawDiscussion, course: Pick<Course, "id" | "name">): Announcement {
  return {
    id: raw.id,
    discussionId: raw.discussion,
    subject: htmlToText(raw.subject || raw.name),
    message: htmlToMarkdown(raw.message),
    preview: htmlToText(raw.message).slice(0, 120),
    author: raw.userfullname,
    created: new Date((raw.created || raw.timemodified) * 1000),
    url: `${BASE_URL}/mod/forum/discuss.php?d=${raw.discussion}`,
    courseId: course.id,
    courseName: course.name,
    attachments: (raw.attachments ?? []).map((a) => ({ name: a.filename, url: browserFileUrl(a.fileurl) })),
  };
}

export async function fetchForumDiscussions(forumId: number, perPage: number): Promise<RawDiscussion[]> {
  const data = await callWs<{ discussions: RawDiscussion[] }>("mod_forum_get_forum_discussions", {
    forumid: forumId,
    sortorder: -1,
    page: 0,
    perpage: perPage,
  });
  return data.discussions;
}

/**
 * Latest announcements across the given courses, newest first. Courses whose forum cannot be read are
 * skipped and reported through `onPartialFailure`; the error is rethrown only when nothing could be loaded.
 */
export async function fetchAnnouncements(
  courses: Course[],
  lang: Lang,
  options: { perForum?: number; onPartialFailure?: (errors: unknown[]) => void } = {},
): Promise<Announcement[]> {
  const perForum = options.perForum ?? 5;
  const byId = new Map(courses.map((course) => [course.id, course]));
  const forums = await fetchNewsForums(
    courses.map((course) => course.id),
    lang,
  );
  const { values, errors } = await collectSettled(
    forums.map(async (forum) => {
      const course = byId.get(forum.courseId);
      if (!course) return [];
      const discussions = await fetchForumDiscussions(forum.id, perForum);
      return discussions.map((d) => toAnnouncement(d, course));
    }),
  );
  reportPartialFailures(errors, values.length, options.onPartialFailure);
  return values.flat().sort((a, b) => b.created.getTime() - a.created.getTime());
}
