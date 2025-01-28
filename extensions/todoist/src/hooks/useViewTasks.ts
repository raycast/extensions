import { useCachedState } from "@raycast/utils";
import { partition } from "lodash";
import { useMemo } from "react";

import { Task, SyncData } from "../api";
import {
  GroupByOption,
  GroupByOptions,
  SectionWithTasks,
  getGroupByOptions,
  groupByAssignees,
  groupByDates,
  groupByLabels,
  groupByPriorities,
  groupByProjects,
} from "../helpers/groupBy";
import {
  OrderByOption,
  OrderByOptions,
  SortByOption,
  SortByOptions,
  applySortOrder,
  getSortByOptions,
  orderByOptions,
  sortByAssignee,
  sortByDate,
  sortByName,
  sortByPriority,
  sortByProject,
} from "../helpers/sortBy";

type ViewProp<T, U> = {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  options: U;
};

export type ViewProps = {
  groupBy?: ViewProp<GroupByOption, GroupByOptions>;
  sortBy: ViewProp<SortByOption, SortByOptions>;
  orderBy?: ViewProp<OrderByOption, OrderByOptions>;
};

type UseViewTasks = {
  tasks: Task[];
  optionsToExclude?: (GroupByOption | SortByOption)[];
  data?: SyncData;
};

export default function useViewTasks(name: string, { tasks, optionsToExclude, data }: UseViewTasks) {
  const projects = useMemo(() => data?.projects ?? [], [data]);
  const labels = useMemo(() => data?.labels ?? [], [data]);
  const collaborators = useMemo(() => data?.collaborators ?? [], [data]);
  const user = useMemo(() => data?.user, [data]);

  const [sortBy, setSortBy] = useCachedState<SortByOption>(name + "sortby", "default");
  const [groupBy, setGroupBy] = useCachedState<GroupByOption>(name + "groupby", "default");
  const [orderBy, setOrderBy] = useCachedState<OrderByOption>(name + "orderby", "asc");

  const { sortByProp, sortedTasks, orderByProp } = useMemo(() => {
    const sortedTasks = [...tasks];

    switch (sortBy) {
      case "name":
        sortedTasks.sort(applySortOrder(orderBy, sortByName));
        break;
      case "assignee":
        sortedTasks.sort(applySortOrder(orderBy, (a: Task, b: Task) => sortByAssignee(collaborators, a, b)));
        break;
      case "date":
        sortedTasks.sort(applySortOrder(orderBy, sortByDate));
        break;
      case "priority":
        sortedTasks.sort(applySortOrder(orderBy, sortByPriority));
        break;
      case "project":
        sortedTasks.sort(applySortOrder(orderBy, (a: Task, b: Task) => sortByProject(projects, a, b)));
        break;
      default:
        break;
    }

    const sortByProp = {
      value: sortBy,
      setValue: setSortBy,
      options: getSortByOptions(tasks, optionsToExclude as SortByOption[]),
    };

    const orderByProp = {
      value: orderBy,
      setValue: setOrderBy,
      options: orderByOptions,
    };

    return { sortedTasks, sortByProp, orderByProp };
  }, [tasks, sortBy, setSortBy, optionsToExclude, orderBy, setOrderBy, collaborators, projects]);

  const { sections, groupByProp } = useMemo(() => {
    let sections: SectionWithTasks[] = [];

    const tasks = [...sortedTasks];

    switch (groupBy) {
      case "assignee":
        sections = groupByAssignees({ tasks, collaborators, user });
        break;
      case "date": {
        const [upcomingTasks, noDatesTasks] = partition(tasks, (task) => task.due);

        sections = groupByDates(upcomingTasks);

        sections.push({
          name: "No date",
          tasks: noDatesTasks,
        });
        break;
      }
      case "priority":
        sections = groupByPriorities(tasks);
        break;
      case "label":
        sections = groupByLabels({ tasks, labels });
        break;
      case "project":
        sections = groupByProjects({ tasks, projects });
        break;
    }

    const groupByProp = {
      value: groupBy,
      setValue: setGroupBy,
      options: getGroupByOptions(tasks, optionsToExclude as GroupByOption[]),
    };

    return { sections, groupByProp };
  }, [sortedTasks, groupBy, setGroupBy, optionsToExclude, collaborators, user, labels, projects]);

  const viewProps: ViewProps = {
    groupBy: groupByProp,
    sortBy: sortByProp,
    orderBy: sortBy === "default" ? undefined : orderByProp,
  };

  return { sections, sortedTasks, viewProps };
}
