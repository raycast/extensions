import { Icon, Image, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { createContext, useContext, useMemo } from "react";
import { useInterval } from "../../hooks/use-interval";
import { useRerender } from "../../hooks/use-rerender";
import type { Schedule, Stage } from "../../types/schedules";
import { SchedulesListByMode } from "./SchedulesListByMode";
import { SchedulesListByTime } from "./SchedulesListByTime";

const REFRESH_INTERVAL = 30 * 1000;
const GAMES_LIMIT = 8;
const SORT_CACHE_KEY = "list-schedules-sort";

export interface OpenInBrowserAction {
  title: string;
  url: string;
}

interface SchedulesListProps extends List.Props {
  openInBrowserAction: OpenInBrowserAction;
  schedules: Schedule[];
}

interface SchedulesListContext {
  openInBrowserAction: OpenInBrowserAction;
}

export const SchedulesListContext = createContext<SchedulesListContext | null>(null);

export function useSchedulesListContext(): SchedulesListContext {
  const context = useContext(SchedulesListContext);

  if (!context) {
    throw new Error();
  }

  return context;
}

export function getStageAccessories(stages: Stage[]): List.Item.Accessory[] {
  return stages.flatMap((stage) => ({
    text: stage.name,
    icon: stage.image
      ? {
          source: stage.image,
          mask: Image.Mask.Circle,
        }
      : {
          source: Icon.Map,
        },
  }));
}

export function SchedulesList({ schedules, openInBrowserAction, ...props }: SchedulesListProps) {
  const [rerender, key] = useRerender();
  const currentSchedules: Schedule[] = useMemo(() => {
    return schedules.map((schedule) => {
      return {
        ...schedule,
        games: schedule.games
          .filter((game) => {
            return game.to.getTime() >= Date.now();
          })
          .slice(0, GAMES_LIMIT),
      };
    });
  }, [schedules, key]);
  const [sort, setSort] = useCachedState(SORT_CACHE_KEY, "time");
  const SchedulesList = sort === "mode" ? SchedulesListByMode : SchedulesListByTime;

  useInterval(rerender, REFRESH_INTERVAL);

  return (
    <SchedulesListContext.Provider value={{ openInBrowserAction: openInBrowserAction }}>
      <SchedulesList
        schedules={currentSchedules}
        searchBarAccessory={
          <List.Dropdown onChange={setSort} tooltip="Change sorting" value={sort}>
            <List.Dropdown.Item icon={Icon.Clock} title="Sort by time" value="time" />
            <List.Dropdown.Item icon={Icon.Tag} title="Sort by mode" value="mode" />
          </List.Dropdown>
        }
        searchBarPlaceholder="Search schedules…"
        {...props}
      />
    </SchedulesListContext.Provider>
  );
}
