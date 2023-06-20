import { useMemo, useState } from "react";
import { useExec } from "@raycast/utils";
import { buildTaskCommand, runTaskCommand } from "../core/helpers/cmd.helper";
import { getParser } from "../core/helpers/parser.helper";
import { ExportableAction, TaskAction } from "../core/types/task.type";
import { Task } from "../core/types/task.model";
import { showToast, Toast } from "@raycast/api";
import { Command } from "../core/types";
import { useAlerts } from "./alert.hook";

type UseTaskCommandProps<T> = {
  isLoading: boolean;
  revalidate: () => void;
  items: T;
  onSave: (task: Partial<Task>) => Promise<string>;
};

export const useTaskCommand = <T extends TaskAction, R = T extends ExportableAction ? Task[] : string[]>(
  command: T
): UseTaskCommandProps<R> => {
  const { cmd, args, compact } = buildTaskCommand({ command });
  const { onBefore, onSuccess, onFailure } = useAlerts(compact);
  const { isLoading, data, revalidate, mutate } = useExec(cmd, args, {
    initialData: "[]",
    keepPreviousData: true,
    onWillExecute: () => {
      onBefore();
    },
    onData: (data) => {
      onSuccess(data);
    },
    onError: (e) => {
      onFailure(e);
    },
  });
  const parser = useMemo(() => getParser(command), [command, data]);
  const items = useMemo(() => parser(data) as R, [command, parser, data]);
  const extract = (task: Partial<Task>) => {
    if (task.uuid && task.uuid !== "") {
      const { uuid, ...params } = task;
      return {
        uuid,
        params,
      };
    }

    return {
      params: task,
    };
  };
  const saveTask = (params: Partial<Task>, command = (params.uuid ? "modify" : "add") as Command) =>
    mutate(runTaskCommand({ command, ...extract(params) }), {
      // update local data right away - without waiting for the call to return
      optimisticUpdate(data) {
        const current = JSON.parse(data || "[]") as Task[];

        if (params.uuid) {
          const i = current.findIndex((t: Task) => t.uuid === params.uuid);
          if (i > -1) {
            current[i] = params as Task;
          }
        } else {
          current.push({
            ...params,
            uuid: Math.random().toString(36).substring(7), // eslint-disable-line no-magic-numbers
            id: String(current.length + 1),
            status: "pending",
            entry: new Date().toISOString(),
          } as Task);
        }
        return JSON.stringify(current);
      },
      shouldRevalidateAfter: true,
    });
  const onSave = async (task: Partial<Task>) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving task..",
    });
    try {
      await saveTask(task);
      toast.style = Toast.Style.Success;
      toast.title = "Task saved!";
    } catch (err) {
      // the data will automatically be rolled back to its previous value
      toast.style = Toast.Style.Failure;
      toast.title = "Could not Save Task!";
      toast.message = String(err);
    }
    return toast.title;
  };

  return {
    isLoading,
    revalidate,
    items,
    onSave,
  };
};

export const useShowDetails = () => {
  const [isShowingDetail, setShowingDetail] = useState(false);
  const toggleDetail = () => setShowingDetail(!isShowingDetail);

  return {
    isShowingDetail,
    toggleDetail,
  };
};
