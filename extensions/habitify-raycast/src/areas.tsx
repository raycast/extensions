import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HabitEmptyStateView, HabitLoadErrorEmptyView } from "./components/HabitEmptyViews";
import HabitListItem from "./components/HabitListItem";
import { deleteCache, formatCacheTimestamp, habitifyCacheKeys, readCache, writeCache } from "./lib/cache";
import { loadTodayHabits } from "./lib/loadTodayHabits";
import { Area, getAreas, TodayHabit } from "./lib/habitify";
import { useHabitMutation } from "./hooks/useHabitMutation";

function AreaHabitsView({
  area,
  apiKey,
  rowColorMode,
}: {
  area: Area;
  apiKey: string;
  rowColorMode: Preferences["rowColorMode"];
}) {
  const [habits, setHabits] = useState<TodayHabit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);
  const habitsRef = useRef<TodayHabit[]>([]);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const loadHabits = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      setCacheNotice(null);

      try {
        const result = await loadTodayHabits(apiKey, { areaId: area.id });
        setHabits(result.habits);
        setCacheNotice(result.cacheNotice);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load area habits.");
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [apiKey, area.id],
  );

  useEffect(() => {
    void loadHabits();
  }, [loadHabits, refreshCounter]);

  const handleRefresh = useCallback(() => {
    void deleteCache(habitifyCacheKeys.habitsByArea(area.id));
    setRefreshCounter((v) => v + 1);
  }, [area.id]);

  const mutateHabit = useHabitMutation({
    apiKey,
    habitsRef,
    setHabits,
    reload: loadHabits,
  });

  const emptyView = useMemo(() => {
    if (error) {
      return <HabitLoadErrorEmptyView error={error} onRetry={handleRefresh} title="Unable to load area habits" />;
    }

    return (
      <HabitEmptyStateView
        icon={Icon.House}
        title={`No habits in ${area.name}`}
        description="This area does not have any active habits right now."
        onRefresh={handleRefresh}
      />
    );
  }, [area.name, error, handleRefresh]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={cacheNotice ? `${area.name} (cached)` : area.name}
      searchBarPlaceholder={`Search ${area.name.toLowerCase()} habits`}
    >
      {habits.length === 0
        ? emptyView
        : habits.map((habit) => (
            <HabitListItem
              key={habit.id}
              habit={habit}
              apiKey={apiKey}
              rowColorMode={rowColorMode}
              onMutate={mutateHabit}
              onRefresh={handleRefresh}
              showTimeOfDay
            />
          ))}
    </List>
  );
}

export default function Command() {
  const { apiKey, rowColorMode } = getPreferenceValues<Preferences>();
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  const loadAreas = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cachedAreas = await readCache<Area[]>(habitifyCacheKeys.areas);
      if (cachedAreas) {
        setAreas(cachedAreas.data);
        setCacheNotice(`Showing cached data from ${formatCacheTimestamp(cachedAreas.savedAt)}`);
      }

      const response = await getAreas(apiKey);
      setAreas(response.data);
      await writeCache(habitifyCacheKeys.areas, response.data);
      setCacheNotice(null);
    } catch (err) {
      const cachedAreas = await readCache<Area[]>(habitifyCacheKeys.areas);
      if (cachedAreas) {
        setAreas(cachedAreas.data);
        setCacheNotice(`Showing cached data from ${formatCacheTimestamp(cachedAreas.savedAt)}`);
      } else {
        setError(err instanceof Error ? err.message : "Unable to load Habitify areas.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas, refreshCounter]);

  const handleRefresh = useCallback(() => {
    setRefreshCounter((v) => v + 1);
  }, []);

  const emptyView = useMemo(() => {
    if (error) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to load Habitify areas"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Retry" onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.House}
        title="No areas found"
        description="Create areas in Habitify to organize your habits."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={handleRefresh} />
          </ActionPanel>
        }
      />
    );
  }, [error, handleRefresh]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={cacheNotice ? "Habit Areas (cached)" : "Habit Areas"}
      searchBarPlaceholder="Search areas"
    >
      {areas.length === 0
        ? emptyView
        : areas.map((area) => (
            <List.Item
              key={area.id}
              title={area.name}
              icon={area.colorHex ? { source: Icon.House, tintColor: area.colorHex } : Icon.House}
              actions={
                <ActionPanel title={area.name}>
                  <Action.Push
                    title="Open Area Habits"
                    icon={Icon.ArrowRight}
                    target={<AreaHabitsView area={area} apiKey={apiKey} rowColorMode={rowColorMode} />}
                  />
                  <Action title="Refresh" icon={Icon.RotateClockwise} onAction={handleRefresh} />
                  <Action.CopyToClipboard title="Copy Area ID" content={area.id} />
                </ActionPanel>
              }
            />
          ))}
    </List>
  );
}
