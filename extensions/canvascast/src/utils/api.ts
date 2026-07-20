import API from "@api-blueprints/pathmaker";
import { getPreferenceValues } from "@raycast/api";

import {
  Preferences,
  course,
  assignment,
  announcement,
  modulesection,
  moduleitem,
  plannernote,
  datefeed,
} from "./types";
import {
  Colors,
  formatModuleItemTitle,
  formatModuleItemPasscode,
  getFormattedDate,
  getFormattedTime,
  getFormattedFriendlyDate,
  convertHTMLToMD,
} from "./utils";

export function getApi(token: string, domain: string) {
  return new API({
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    baseUrl: `https://${domain}/api/v1`,
  });
}

const preferences: Preferences = getPreferenceValues();
export const api = getApi(preferences.token, preferences.domain);

export const checkApi = async () => {
  return await api.courses
    .searchParams({
      state: "available",
      enrollment_state: "active",
    })
    .get();
};

interface getCoursesConfig {
  noAssignments?: boolean;
  noAnnouncements?: boolean;
}

export const getCourses = async (json, config?: getCoursesConfig): Promise<course[]> => {
  const favorites = await api.users.self.favorites.courses
    .searchParams({
      state: "available",
      enrollment_state: "active",
    })
    .get();
  const ids = favorites.map((favorite) => favorite.id);
  const courses: course[] = json
    .filter((item) => ids.includes(item.id))
    .map((course, index: number) => ({
      name: course.name,
      code: course.course_code,
      id: course.id,
      color: Colors[index % Colors.length],
    }));
  if (!config?.noAssignments) {
    const promises = courses.map((course: course, i: number): assignment[] => {
      return api.courses[course.id].assignments
        .searchParams({ order_by: "due_at" })
        .get()
        .then((json) => {
          return json
            .filter((assignment) => assignment.due_at && new Date(assignment.due_at).getTime() > Date.now())
            .map((assignment) => ({
              name: assignment.name,
              id: assignment.id,
              description: `# ${assignment.name}\n\n${convertHTMLToMD(assignment.description)}`,
              pretty_date: "Due by " + getFormattedTime(assignment.due_at),
              date: new Date(assignment.due_at),
              course: course.name,
              course_id: course.id,
              color: Colors[i % Colors.length],
              submitted: assignment.has_submitted_submissions,
            }));
        });
    });
    const assignments = await Promise.all(promises);
    courses.forEach((course: course, index: number) => {
      course.assignments = assignments[index];
    });
  }
  if (!config?.noAnnouncements) {
    const promises = courses.map((course: course, i: number): announcement[] => {
      return api.announcements
        .searchParams({ context_codes: ["course_" + course.id] })
        .get()
        .then((json) => {
          return json.map((announcement) => ({
            title: announcement.title,
            course_id: course.id,
            color: Colors[i % Colors.length],
            course: course.name,
            id: announcement.id,
            markdown: `# ${announcement.title}\n\n${convertHTMLToMD(announcement.message)}`,
            pretty_date: getFormattedDate(announcement.created_at),
            date: new Date(announcement.created_at),
          }));
        });
    });
    const announcements = await Promise.all(promises);
    courses.forEach((course: course, index: number) => {
      course.announcements = announcements[index];
    });
  }
  return courses;
};

export const getModules = async (course_id: number): Promise<modulesection[]> => {
  const json = await api.courses[course_id].modules.searchParams({ include: "items" }).get();
  const modules: modulesection[] = json.map((module) => {
    const items: moduleitem[] = module.items.map((i) => ({
      id: i.id,
      name: formatModuleItemTitle(i.title),
      type: i.type,
      url: i.html_url,
      passcode: formatModuleItemPasscode(i.title),
      content_id: i.content_id,
    }));
    return {
      name: module.name,
      items: items,
    };
  });
  return modules;
};

export const getFeed = async (courses: course[]): Promise<plannernote[]> => {
  const feed = await api.planner.items
    .searchParams({
      per_page: 100,
      start_date: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(),
      end_date: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(),
    })
    .get();
  const items = [];
  for (const item of feed) {
    let custom_type = undefined,
      custom_object = undefined;
    if (item.plannable_type == "announcement" && courses.filter((course) => course.id == item.course_id)[0]) {
      custom_type = "announcement";
      custom_object = {
        title: item.plannable.title,
        course_id: item.course_id,
        color: Colors[courses.indexOf(courses.filter((course) => course.id == item.course_id)[0]) % Colors.length],
        course: courses.filter((course) => course.id == item.course_id)[0].name,
        id: item.plannable.id,
        pretty_date: getFormattedTime(item.plannable.created_at),
        date: new Date(item.plannable.created_at),
        time: true,
      };
    }
    if (item.plannable_type == "assignment" && courses.filter((course) => course.id == item.course_id)[0]) {
      custom_type = "assignment";
      custom_object = {
        name: item.plannable.title ?? item.plannable.name,
        course_id: item.course_id,
        color: Colors[courses.indexOf(courses.filter((course) => course.id == item.course_id)[0]) % Colors.length],
        course: courses.filter((course) => course.id == item.course_id)[0].name,
        id: item.plannable.id,
        date: item?.plannable?.due_at ? new Date(item.plannable.due_at) : undefined,
        pretty_date: "Due by " + getFormattedTime(item.plannable.due_at),
        time: true,
        submitted: item.plannable.has_submitted_submissions,
      };
    }
    if (item.plannable_type == "quiz" && courses.filter((course) => course.id == item.course_id)[0]) {
      custom_type = "quiz";
      custom_object = {
        name: item.plannable.title ?? item.plannable.name,
        course_id: item.course_id,
        color: Colors[courses.indexOf(courses.filter((course) => course.id == item.course_id)[0]) % Colors.length],
        course: courses.filter((course) => course.id == item.course_id)[0].name,
        id: item.plannable.id,
        date: new Date(item.plannable.due_at ?? item.plannable_date),
        pretty_date: "Due by " + getFormattedTime(item.plannable.due_at ?? item.plannable_date),
        time: true,
        submitted: item.plannable.has_submitted_submissions,
      };
    }
    items.push({
      id: item.plannable.id,
      title: item.plannable.title ?? item.plannable.name,
      type: item.plannable_type,
      creation_date: new Date(item.plannable.created_at),
      due_date: item?.plannable?.due_at ? new Date(item.plannable.due_at) : undefined,
      plannable_date: item.plannable_date,
      custom_type,
      custom_object,
      submission: item.submissions,
      announcement: custom_type == "announcement" ? custom_object : undefined,
      assignment: custom_type == "assignment" ? custom_object : undefined,
      quiz: custom_type == "quiz" ? custom_object : undefined,
    });
  }
  return items;
};

export const getDatedFeed = async (courses: course[]): Promise<datefeed[]> => {
  const feed = await getFeed(courses);
  const dates = {};
  for (const item of feed) {
    if (!dates[new Date(item.due_date ?? item.plannable_date ?? item.creation_date).toDateString()])
      dates[new Date(item.due_date ?? item.plannable_date ?? item.creation_date).toDateString()] = {
        date: item.due_date ?? item.plannable_date ?? item.creation_date,
        items: [],
      };
    dates[new Date(item.due_date ?? item.plannable_date ?? item.creation_date).toDateString()].items.push(item);
  }
  const output = [];
  for (const date in dates) {
    output.push({
      date: dates[date].date,
      today: getFormattedFriendlyDate(dates[date].date) == getFormattedFriendlyDate(new Date()),
      items: dates[date].items.sort(
        (a, b) =>
          a?.custom_object?.course?.localeCompare(b?.custom_object?.course) ||
          a?.custom_object?.date - b?.custom_object?.date,
      ),
      pretty_date: getFormattedFriendlyDate(dates[date].date),
    });
  }
  return output;
};
