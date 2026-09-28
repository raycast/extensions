import { api } from "../../utils/api";
import { z } from "zod";
import { Project } from "./types";
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

export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await api.get("/projects/assigned");

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
