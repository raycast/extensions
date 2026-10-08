import { getNext7Days, getToday } from "../service/osScript";
import { initGlobalProjectInfo } from "../service/project";
import { Task } from "../service/task";

type Input = {
  smartProjectId: "today" | "next7Days" | undefined;
};

export default async function (input: Input) {
  const { smartProjectId } = input;
  await initGlobalProjectInfo();

  const tasksWithDateSection = await (async () => {
    if (smartProjectId) {
      switch (smartProjectId) {
        case "today":
          return await getToday();
        case "next7Days":
          return await getNext7Days();
        default:
          return [];
      }
    }
  })();
  if (tasksWithDateSection) {
    const tasks = tasksWithDateSection.reduce((tasks: Task[], section) => {
      if (section.name !== "Overdue") {
        return tasks.concat(section.children);
      }
      return tasks;
    }, []);
    return tasks;
  }
  return [];
}
