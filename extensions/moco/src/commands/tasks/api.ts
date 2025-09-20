import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { z } from "zod";
import { Task } from "./types";
import { Preferences } from "../../types";

const taskSchema = z.array(
  z.object({
    id: z.number().int(),
    name: z.string(),
    active: z.boolean(),
    billable: z.boolean(),
    budget: z.number(),
    projectID: z.number(),
  }),
);

const preferences = getPreferenceValues<Preferences>();
axios.defaults.baseURL = `https:/${preferences.url_prefix}.mocoapp.com/api/v1`;

export const fetchProjectTasks = async (projectID: number): Promise<Task[]> => {
  const { data } = await axios.get(`/projects/${projectID}/tasks`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Token token=${preferences.apikey}`,
    },
  });

  const tasks = taskSchema.parse(data);

  return Object.values(tasks)
    .filter((task) => task.name)
    .filter((task) => task.active)
    .map(
      (task): Task => ({
        id: task.id as number,
        name: task.name as string,
        billable: task.billable as boolean,
        projectID: projectID as number,
      }),
    );
};
