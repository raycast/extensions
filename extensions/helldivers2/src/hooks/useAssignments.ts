import { planets } from "../data/planets";
import { useFetch } from "./useFetch";
import { useWarInfo } from "./useWarInfo";
import { useWarStatus } from "./useWarStatus";

interface AssignmentReward {
  type: number;
  amount: number;
}

interface AssignmentTask {
  type: number;
  values: number[];
  valueTypes: number[];
}

interface AssignmentSetting {
  type: number;
  overrideTitle: string;
  overrideBrief: string;
  taskDescription: string;
  tasks: AssignmentTask[];
  rewards: AssignmentReward[];
}

interface Assignment {
  progress: number[];
  expiresIn: number;
  setting: AssignmentSetting;
}

export const useAssignments = () => {
  const { isLoading: isInfoLoading, info } = useWarInfo();
  const { isLoading: isStatusLoading, status } = useWarStatus();

  const { isLoading, data } = useFetch(
    isInfoLoading ? undefined : `https://api.live.prod.thehelldiversgame.com/api/v2/Assignment/War/${info?.warId}`,
    {
      headers: {
        cache: "no-cache",
        "accept-language": "en-US,en;q=0.9",
      },
    },
  );

  const assignments = (data as Assignment[] | undefined)?.map((assignment) => {
    const tasks = assignment.setting.tasks.map((task) => {
      const planetStatus = status!.planetStatus.find((status) => status.index == task.values[2])!;
      const planetInfo = info!.planetInfos.find((info) => info.index == task.values[2])!;

      return {
        ...task,
        planet: planets[task.values[2]],
        status: planetStatus,
        info: planetInfo,
      };
    });

    return {
      ...assignment,
      setting: {
        ...assignment.setting,
        tasks,
      },
    };
  });

  return { isLoading: isLoading || isStatusLoading || isInfoLoading, assignments: assignments };
};
