import { LocalStorage } from "@raycast/api";
import { Instance, tokenForInstance } from "../instances";
import { Project } from "../interfaces";
import { getTotalServices, isModernProject } from "../utils";

type Input = {
  /** Only search this configured instance, matched case-insensitively against its name. Omit to search every configured instance. */
  instance?: string;
};

/**
 * Every project across the configured instance(s), with each project's environments (or, for a
 * legacy pre-environments project, the project itself) and how many services each one holds.
 */
export default async function tool(input: Input) {
  const raw = await LocalStorage.getItem<string>("instances");
  const allInstances: Instance[] = raw ? JSON.parse(raw) : [];
  const instances = input.instance
    ? allInstances.filter((instance) => instance.name.toLowerCase().includes(input.instance!.toLowerCase()))
    : allInstances;

  if (instances.length === 0) {
    throw new Error(
      input.instance
        ? `No configured instance matches "${input.instance}".`
        : "No Dokploy instances are configured in this extension yet.",
    );
  }

  const results = await Promise.allSettled(
    instances.map(async (instance) => {
      const { url, headers } = tokenForInstance(instance);
      const response = await fetch(url + "project.all", { headers });
      if (!response.ok) throw new Error(`${response.status}`);
      return (await response.json()) as Project[];
    }),
  );

  return {
    instances: results.map((result, index) => {
      const instance = instances[index];
      if (result.status === "rejected") {
        return { instance: instance.name, error: `${result.reason}` };
      }
      return {
        instance: instance.name,
        projects: result.value.map((project) =>
          isModernProject(project)
            ? {
                name: project.name,
                description: project.description || undefined,
                environments: project.environments.map((environment) => ({
                  name: environment.name,
                  serviceCount: getTotalServices(environment),
                })),
              }
            : {
                name: project.name,
                description: project.description || undefined,
                serviceCount: getTotalServices(project),
              },
        ),
      };
    }),
  };
}
