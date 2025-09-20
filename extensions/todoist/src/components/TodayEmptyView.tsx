import { Action, Icon, List } from "@raycast/api";
import { ActionPanel } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { format } from "date-fns";
import { useMemo } from "react";

import { getProductivityStats } from "../api";
import CreateTask from "../create-task";
import { QuickLinkView } from "../home";
import useCachedData from "../hooks/useCachedData";

import CreateViewActions from "./CreateViewActions";

type TodayEmptyViewProps = { quickLinkView: QuickLinkView };

export default function TodayEmptyView({ quickLinkView }: TodayEmptyViewProps) {
  const [data] = useCachedData();
  const { data: stats } = useCachedPromise(() => getProductivityStats());

  const emptyViewProps = useMemo(() => {
    const createNewTaskActionPanel = (
      <ActionPanel>
        <Action.Push
          title="Create Task for Today"
          icon={Icon.Plus}
          target={<CreateTask fromTodayEmptyView={true} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        />

        {quickLinkView ? (
          <ActionPanel.Section>
            <CreateViewActions {...quickLinkView} />
          </ActionPanel.Section>
        ) : null}
      </ActionPanel>
    );

    if (stats) {
      const todayStats = stats?.days_items.find((d) => d.date === format(Date.now(), "yyyy-MM-dd"));

      const completedToday = todayStats?.total_completed ?? 0;
      const dailyGoal = data?.user.daily_goal ?? 0;

      if (completedToday === 0) {
        return {
          title: "You don't have any tasks for today.",
          description: "How about adding one?",
          actions: createNewTaskActionPanel,
        };
      }

      const getTaskWord = (nb: number) => (nb === 1 ? `${nb} task` : `${nb} tasks`);

      if (completedToday >= dailyGoal) {
        return {
          title: `Congrats! You've completed ${getTaskWord(completedToday)} today.`,
          description: "Go ahead and enjoy the rest of your day.",
          icon: "🎉",
        };
      }

      return {
        title: `Congrats! You've completed ${getTaskWord(completedToday)} today.`,
        description: `You're ${getTaskWord(dailyGoal - completedToday)} away from your daily goal. Keep it up!`,
        icon: "💪",
        actions: createNewTaskActionPanel,
      };
    }
  }, [data, quickLinkView, stats]);

  return <List.EmptyView {...emptyViewProps} />;
}
