import { planets } from "../data/planets";
import { useFetch } from "./useFetch";
import { useWarInfo } from "./useWarInfo";
import { useWarStatus } from "./useWarStatus";

const GOAL_VALUE_TYPE = 3;
const LOCATION_TYPE_VALUE_TYPE = 11;
const LOCATION_INDEX_VALUE_TYPE = 12;
const PLANET_LOCATION_TYPE = 1;

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
    info && status ? `https://api.live.prod.thehelldiversgame.com/api/v2/Assignment/War/${info.warId}` : undefined,
    {
      headers: {
        cache: "no-cache",
        "accept-language": "en-US,en;q=0.9",
      },
    },
  );

  const assignments = (data as Assignment[] | undefined)?.map((assignment) => {
    const tasks = assignment.setting.tasks.map((task) => {
      const valueOf = (valueType: number) => task.values.find((_, i) => task.valueTypes[i] === valueType);
      // Super Earth is index 0, and so is every task with no single planet; only location type 1 tells them apart.
      const planetIndex =
        valueOf(LOCATION_TYPE_VALUE_TYPE) === PLANET_LOCATION_TYPE ? valueOf(LOCATION_INDEX_VALUE_TYPE) : undefined;

      return {
        ...task,
        goal: valueOf(GOAL_VALUE_TYPE),
        planet: planetIndex === undefined ? undefined : planets[planetIndex],
        status: status?.planetStatus.find((status) => status.index === planetIndex),
        info: info?.planetInfos.find((info) => info.index === planetIndex),
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
