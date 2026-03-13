import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { z } from "zod";
import { Project } from "./types";
import { Preferences } from "../../types";
import { Customer } from "../customers/types";
import { Task } from "../tasks/types";

const projectSchema = z.array(
  z.object({
    id: z.number().int(),
    identifier: z.string(),
    name: z.string(),
    active: z.boolean(),
    billable: z.boolean(),
    customer: z.object({
      id: z.number(),
      name: z.string(),
    }),
    tasks: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        active: z.boolean(),
        billable: z.boolean(),
      }),
    ),
  }),
);

const preferences = getPreferenceValues<Preferences>();
axios.defaults.baseURL = `https:/${preferences.url_prefix}.mocoapp.com/api/v1`;

export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await axios.get("/projects/assigned", {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Token token=${preferences.apikey}`,
    },
  });

  const projects = projectSchema.parse(data);

  return Object.values(projects)
    .filter((project) => project.name)
    .filter((project) => project.active)
    .map(
      (project): Project => ({
        id: project.id as number,
        name: project.name as string,
        identifier: project.identifier as string,
        active: project.active as boolean,
        billable: project.billable as boolean,
        customer: project.customer as Customer,
        tasks: project.tasks as Task[],
      }),
    );
};
