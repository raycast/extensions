import { LocalStorage } from "@raycast/api";
import { addTask } from "../service/osScript";
import { getProjects, initGlobalProjectInfo } from "../service/project";
import { formatToServerDate } from "../utils/date";
import moment from "moment-timezone";

type Input = {
  title: string;
  projectName?: string;
  dueDate?: string;
  content?: string;
};

export default async function (input: Input) {
  const { title, projectName: inputProjectName, dueDate, content } = input;
  await initGlobalProjectInfo();
  const defaultProjectId = await LocalStorage.getItem<string>("defaultAddList");
  const projectId = getProjects().find((project) => project.name === inputProjectName)?.id || defaultProjectId || "";
  const projectName = getProjects().find((project) => project.id === projectId)?.name || "Inbox";

  await addTask({
    projectId,
    title: title.replace(/"/g, `\\"`),
    description: content?.replace(/"/g, `\\"`) || "",
    dueDate: dueDate ? formatToServerDate(moment(dueDate)) : undefined,
    isAllDay: false,
  });

  return `Reply user: Task "${title}" has been added to ${projectName}.${content ? `\nContent: ${content}` : ""}${
    dueDate ? `\nDue Date: ${moment(dueDate).format("MMM Do, h:mm a")}` : ""
  }`;
}
