import API from "@api-blueprints/pathmaker";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, course, assignment, announcement, modulesection, moduleitem } from "./types";
import { Colors, formatModuleItemTitle, formatModuleItemPasscode } from "./utils";
import TurndownService from "turndown-rn";

export function getApi(token: string, domain: string) {
  return new API({
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    baseUrl: "https://" + domain + "/api/v1",
  });
}

const preferences: Preferences = getPreferenceValues();
const api = getApi(preferences.token, preferences.domain);
const service = new TurndownService();

export const checkApi = async () => {
  return await api["courses?state=available&enrollment_state=active"].get();
};

export const getCourses = async (json: any): Promise<course[]> => {
  const favorites = await api.users.self.favorites["courses?state=available&enrollment_state=active"].get();
  const ids = favorites.map((favorite: any) => favorite.id);
  return json
    .filter((item: any) => ids.includes(item.id))
    .map(
      (course: any, index: number): course => ({
        name: course.name,
        code: course.course_code,
        id: course.id,
        color: Colors[index % Colors.length],
        assignments: [],
      })
    );
};

export const getAssignments = async (courses: course[]): Promise<assignment[][]> => {
  const promises = courses.map((course: any, i: number): assignment[] => {
    return api.courses[course.id].assignments["?order_by=due_at"].get().then((json: any) => {
      return json
        .filter((assignment: any) => assignment.due_at && new Date(assignment.due_at).getTime() > Date.now())
        .map(
          (assignment: any): assignment => ({
            name: assignment.name,
            id: assignment.id,
            description: `# ${assignment.name}\n\n` + service.turndown(assignment.description),
            date: new Date(assignment.created_at).toString().split(" ").slice(0, 4).join(" "),
            course: course.name,
            course_id: course.id,
            color: Colors[i % Colors.length],
          })
        );
    });
  });
  return await Promise.all(promises);
};

export const getAnnouncements = async (courses: course[]): Promise<announcement[]> => {
  const query = "announcements?" + courses.map((a) => "context_codes[]=course_" + a.id).join("&");
  const json = await api[query].get();
  return json.map(
    (announcement: any): announcement => ({
      title: announcement.title,
      course_id: +announcement.context_code.substring(7),
      color:
        Colors[
          courses.indexOf(courses.filter((course: any) => course.id == announcement.context_code.substring(7))[0]) %
            Colors.length
        ],
      course: courses.filter((course) => course.id == announcement.context_code.substring(7))[0].name,
      id: announcement.id,
      markdown: `# ${announcement.title}\n\n` + service.turndown(announcement.message),
      date: new Date(announcement.created_at).toString().split(" ").slice(0, 4).join(" "),
    })
  );
};

export const getModules = async (course_id: number): Promise<modulesection[]> => {
  const json = await api.courses[course_id].modules["?include=items"].get();
  const modules = json.map((module: any): modulesection => {
    const items = module.items
      .filter((item: any) => item.type !== "SubHeader")
      .map(
        (item: any): moduleitem => ({
          id: item.content_id,
          name: formatModuleItemTitle(item.title),
          type: item.type,
          url: item.html_url,
          passcode: formatModuleItemPasscode(item.title),
        })
      );
    return {
      name: module.name,
      items: items,
    };
  });
  const promises = [];
  modules.map((module: modulesection) => {
    module.items
      .filter((item: moduleitem) => item.type === "File")
      .map((item: moduleitem) => {
        promises.push(
          api.courses[course_id].files[item.id].get().then((json: any) => {
            return json.url;
          })
        );
      });
  });
  const urls = await Promise.all(promises);
  let i = 0;
  modules.map((module: modulesection) => {
    module.items.map((item: moduleitem) => {
      if (item.type === "File") {
        item.download = urls[i++];
      }
    });
  });
  return modules;
};
