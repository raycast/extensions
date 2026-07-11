import { useCachedPromise, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { clockodo, formatDate, getCustomer, getMe, getProject, getProjects } from "./clockodo";
import { dayjs } from "./lib";

export const useRecentEntries = () => {
  const abortable = useRef(new AbortController());
  return useCachedPromise(
    async () => {
      const user = await getMe();
      const { entries } = await clockodo.getEntries({
        timeSince: formatDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // Last 3 days
        timeUntil: formatDate(new Date()),
        filter: {
          usersId: user.data.id,
        },
      });
      const sortedEntries = entries.toSorted(
        (a, b) => new Date(b.timeSince).getTime() - new Date(a.timeSince).getTime(),
      );
      return Promise.all(
        sortedEntries.map(async (entry) => ({
          ...entry,
          projectName: entry.projectsId ? (await getProject(entry.projectsId))?.name : null,
          customerName: entry.customersId ? (await getCustomer(entry.customersId))?.name : null,
        })),
      );
    },
    [],
    {
      abortable,
    },
  );
};

export const useWeekOverview = () => {
  const abortable = useRef(new AbortController());
  return useCachedPromise(
    async () => {
      const user = await getMe();
      const { groups } = await clockodo.getEntryGroups({
        timeSince: formatDate(dayjs().startOf("week").toDate()),
        timeUntil: formatDate(dayjs().endOf("week").toDate()),
        grouping: ["day"],
        filter: {
          usersId: user.data.id,
        },
      });
      const sortedGroups = groups.toSorted((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
      return { groups: sortedGroups };
    },
    [],
    {
      abortable,
    },
  );
};

export const useGroupedProjects = () => {
  return usePromise(async () => {
    const projects = await getProjects();
    const sortedProjects = projects.data.toSorted((a, b) => a.name.localeCompare(b.name));
    const projectsWithCustomerName = await Promise.all(
      sortedProjects.map(async (project) => {
        const customer = await getCustomer(project.customersId);
        return {
          ...project,
          customerName: customer?.name ?? "Unknown Customer",
        };
      }),
    );
    const groupedProjects = Object.groupBy(projectsWithCustomerName, (project) => project.customerName);

    return groupedProjects;
  });
};
