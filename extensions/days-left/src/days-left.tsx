import { ActionPanel, Action, List, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { CacheManager, Goal } from "./cache-utils";
import { DEFAULT_START_DATE, BASE_GOAL_DATE, GOAL_INTERVALS } from "./constants";

interface Preferences {
  startDate: string;
}

export default function Command() {
  const [goals, setGoals] = useState<Goal[]>([]);

  // Update ref whenever goals change
  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);
  const [daysGone, setDaysGone] = useState(0);
  const [startDate, setStartDate] = useState<Date>(new Date(DEFAULT_START_DATE)); // Default past date
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const goalsRef = useRef<Goal[]>([]);

  // Load cached data
  const loadCachedData = () => {
    return CacheManager.loadData();
  };

  // Save data to cache
  const saveToCache = (goals: Goal[], startDate: Date) => {
    CacheManager.saveData(goals, startDate);
  };

  // Initialize goals
  const initializeGoals = (): Goal[] => {
    const baseDate = new Date(BASE_GOAL_DATE);
    return [
      {
        id: "goal-1",
        title: "7 days",
        targetDate: new Date(baseDate.getTime() + GOAL_INTERVALS.FIRST_MILESTONE * 24 * 60 * 60 * 1000),
        reward: "Radhe Snacks",
        completed: false,
      },
      {
        id: "goal-2",
        title: "14 days",
        targetDate: new Date(baseDate.getTime() + GOAL_INTERVALS.SECOND_MILESTONE * 24 * 60 * 60 * 1000),
        reward: "Buy that book you've been wanting 📚",
        completed: false,
      },
      {
        id: "goal-3",
        title: "1 month",
        targetDate: new Date(baseDate.getTime() + GOAL_INTERVALS.THIRD_MILESTONE * 24 * 60 * 60 * 1000),
        reward: "Get a massage or spa day 💆‍♀️",
        completed: false,
      },
      {
        id: "goal-4",
        title: "2 months",
        targetDate: new Date(baseDate.getTime() + GOAL_INTERVALS.FINAL_GOAL * 24 * 60 * 60 * 1000),
        reward: "Big reward: Plan a weekend trip! ✈️",
        completed: false,
      },
    ];
  };

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);

      // Try to load cached data first
      const cachedData = loadCachedData();

      if (cachedData) {
        // Use cached start date or preferences
        const prefs = getPreferenceValues<Preferences>();
        const finalStartDate = prefs.startDate ? new Date(prefs.startDate) : new Date(cachedData.startDate);
        setStartDate(finalStartDate);

        // Parse dates from cached goals
        const parsedGoals = cachedData.goals.map((goal) => ({
          ...goal,
          targetDate: new Date(goal.targetDate),
        }));
        setGoals(parsedGoals);
      } else {
        // Initialize with default data
        const prefs = getPreferenceValues<Preferences>();
        if (prefs.startDate) {
          setStartDate(new Date(prefs.startDate));
        }

        const initialGoals = initializeGoals();
        setGoals(initialGoals);

        // Save initial data to cache
        saveToCache(initialGoals, startDate);
      }

      // Update current time immediately for accurate initial state
      setCurrentTime(new Date());
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Real-time timer to update completion status
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds for more responsive updates

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Calculate days gone whenever startDate or currentTime changes
    const timeDiff = currentTime.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    setDaysGone(daysDiff);
  }, [startDate, currentTime]);

  // Update completion status and save to cache
  useEffect(() => {
    if (goalsRef.current.length > 0) {
      const updatedGoals = goalsRef.current.map((goal) => ({
        ...goal,
        completed: currentTime >= goal.targetDate,
      }));

      // Always update to ensure real-time status
      setGoals(updatedGoals);
      saveToCache(updatedGoals, startDate);
    }
  }, [currentTime, startDate]); // Only depend on currentTime and startDate

  const calculateProgress = (targetDate: Date): number => {
    const totalDays = (targetDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    const elapsedDays = (currentTime.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

    if (elapsedDays <= 0) return 0;
    if (elapsedDays >= totalDays) return 100;
    return Math.min((elapsedDays / totalDays) * 100, 100);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysUntil = (targetDate: Date): number => {
    const timeDiff = targetDate.getTime() - currentTime.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  const isGoalCompleted = (targetDate: Date): boolean => {
    return currentTime >= targetDate;
  };

  const markGoalCompleted = (goalId: string) => {
    const updatedGoals = goals.map((goal) => (goal.id === goalId ? { ...goal, completed: true } : goal));
    setGoals(updatedGoals);
    saveToCache(updatedGoals, startDate);

    showToast({
      style: Toast.Style.Success,
      title: "Goal Completed! 🎉",
      message: "Time to claim your reward!",
    });
  };

  const claimReward = (goal: Goal) => {
    showToast({
      style: Toast.Style.Success,
      title: "Reward Claimed! 🎁",
      message: goal.reward,
    });
  };

  const resetProgress = () => {
    const initialGoals = initializeGoals();
    setGoals(initialGoals);
    saveToCache(initialGoals, startDate);

    showToast({
      style: Toast.Style.Success,
      title: "Progress Reset",
      message: "All goals have been reset to initial state",
    });
  };

  const clearCache = () => {
    CacheManager.clearCache();
    showToast({
      style: Toast.Style.Success,
      title: "Cache Cleared",
      message: "All cached data has been removed",
    });
  };

  const refreshData = () => {
    setCurrentTime(new Date());
    showToast({
      style: Toast.Style.Success,
      title: "Data Refreshed",
      message: "Updated to current time",
    });
  };

  if (isLoading) {
    return (
      <List>
        <List.Item title="Loading..." icon="⏳" />
      </List>
    );
  }

  return (
    <List>
      <List.Section title="📅 Days Gone Since Start">
        <List.Item
          title={`${daysGone} days have passed`}
          subtitle={`Since ${formatDate(startDate)}`}
          icon="📊"
          accessories={[{ text: `${daysGone} days`, icon: "⏰" }]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Data"
                icon="🔄"
                onAction={refreshData}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="🎯 Future Goals & Progress">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.targetDate);
          const daysUntil = getDaysUntil(goal.targetDate);
          const isCompleted = isGoalCompleted(goal.targetDate);

          return (
            <List.Item
              key={goal.id}
              title={goal.title}
              subtitle={goal.reward}
              icon={isCompleted ? "✅" : "❌"}
              accessories={[
                { text: `${Math.round(progress)}%`, icon: "📈" },
                { text: isCompleted ? "Completed" : `${daysUntil} days left`, icon: "⏰" },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Target Date" text={formatDate(goal.targetDate)} />
                      <List.Item.Detail.Metadata.Label title="Progress" text={`${Math.round(progress)}%`} />
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={isCompleted ? "Completed" : "In Progress"}
                      />
                      <List.Item.Detail.Metadata.Label title="Reward" text={goal.reward} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action title="Refresh Status" icon="🔄" onAction={refreshData} />
                  {!isCompleted && (
                    <Action title="Mark as Completed" icon="✅" onAction={() => markGoalCompleted(goal.id)} />
                  )}
                  {isCompleted && <Action title="Claim Reward" icon="🎁" onAction={() => claimReward(goal)} />}
                  <Action.CopyToClipboard
                    title="Copy Progress"
                    content={`${goal.title}: ${Math.round(progress)}% complete`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="📊 Progress Summary">
        <List.Item
          title="Overall Progress"
          subtitle={`${goals.filter((g) => isGoalCompleted(g.targetDate)).length} of ${goals.length} goals completed`}
          icon="📊"
          accessories={[
            {
              text: `${Math.round((goals.filter((g) => isGoalCompleted(g.targetDate)).length / goals.length) * 100)}%`,
              icon: "🎯",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Refresh Data" icon="🔄" onAction={refreshData} />
              <Action title="Reset All Progress" icon="🔄" onAction={resetProgress} style={Action.Style.Destructive} />
              <Action title="Clear Cache" icon="🗑️" onAction={clearCache} style={Action.Style.Destructive} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
