import { Action, ActionPanel, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { getCalendarsWithColors } from "./calendar";
import { CalendarInfo } from "./types";
import {
  getVisibleCalendarIds,
  setVisibleCalendarIds,
  getDefaultCalendarId,
  setDefaultCalendarId,
} from "./preferences";

export default function ManageCalendars() {
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);
  const [defaultId, setDefaultIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [allCals, savedVisible, savedDefault] = await Promise.all([
        getCalendarsWithColors(),
        getVisibleCalendarIds(),
        getDefaultCalendarId(),
      ]);
      if (cancelled) return;

      setCalendars(allCals);
      setVisibleIds(savedVisible);
      setDefaultIdState(savedDefault);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute effective visible set: null means all visible
  const effectiveVisibleIds = useMemo(() => {
    if (visibleIds === null) {
      return new Set(calendars.map((c) => c.id));
    }
    return new Set(visibleIds);
  }, [visibleIds, calendars]);

  // Group calendars by account
  const calendarsByAccount = useMemo(() => {
    const grouped = new Map<string, CalendarInfo[]>();
    for (const cal of calendars) {
      const account = cal.accountName || "Other";
      if (!grouped.has(account)) grouped.set(account, []);
      grouped.get(account)!.push(cal);
    }
    return grouped;
  }, [calendars]);

  async function toggleCalendar(id: string) {
    let newIds: string[];
    if (visibleIds === null) {
      // Currently showing all — toggle OFF this one
      newIds = calendars.map((c) => c.id).filter((cid) => cid !== id);
    } else if (visibleIds.includes(id)) {
      // Don't allow hiding ALL calendars
      if (visibleIds.length <= 1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "At least one calendar must be visible",
        });
        return;
      }
      newIds = visibleIds.filter((cid) => cid !== id);
    } else {
      newIds = [...visibleIds, id];
    }

    // If all calendars are now visible, clear the filter
    const allIds = calendars.map((c) => c.id);
    const allVisible = allIds.every((cid) => newIds.includes(cid));

    const finalIds = allVisible ? null : newIds;
    setVisibleIds(finalIds);
    await setVisibleCalendarIds(finalIds);
  }

  async function handleSetDefault(id: string) {
    const isAlreadyDefault = defaultId === id;
    const newDefault = isAlreadyDefault ? null : id;
    setDefaultIdState(newDefault);
    await setDefaultCalendarId(newDefault);

    const cal = calendars.find((c) => c.id === id);
    await showToast({
      style: Toast.Style.Success,
      title: isAlreadyDefault ? "Default calendar cleared" : `Default: ${cal?.name || "Unknown"}`,
    });
  }

  async function showAll() {
    setVisibleIds(null);
    await setVisibleCalendarIds(null);
    await showToast({
      style: Toast.Style.Success,
      title: "All calendars visible",
    });
  }

  async function hideAll() {
    // Can't hide all — keep at least the default or first
    const keepId = defaultId || (calendars.length > 0 ? calendars[0].id : null);
    if (!keepId) return;
    const newIds = [keepId];
    setVisibleIds(newIds);
    await setVisibleCalendarIds(newIds);
    const cal = calendars.find((c) => c.id === keepId);
    await showToast({
      style: Toast.Style.Success,
      title: `Only "${cal?.name}" visible`,
    });
  }

  const visibleCount = effectiveVisibleIds.size;
  const totalCount = calendars.length;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter calendars...">
      {Array.from(calendarsByAccount.entries()).map(([account, cals]) => (
        <List.Section key={account} title={account} subtitle={`${cals.length} calendars`}>
          {cals.map((cal) => {
            const isVisible = effectiveVisibleIds.has(cal.id);
            const isDefault = defaultId === cal.id;
            const tintColor = cal.color
              ? {
                  light: cal.color,
                  dark: cal.color,
                  adjustContrast: false,
                }
              : Color.SecondaryText;

            return (
              <List.Item
                key={cal.id}
                icon={
                  isVisible
                    ? {
                        source: Icon.CheckCircle,
                        tintColor: Color.Green,
                      }
                    : {
                        source: Icon.Circle,
                        tintColor: Color.SecondaryText,
                      }
                }
                title={cal.name}
                subtitle={isDefault ? "Default Calendar" : undefined}
                accessories={[
                  ...(isDefault
                    ? [
                        {
                          tag: {
                            value: "Default",
                            color: Color.Blue,
                          },
                        },
                      ]
                    : []),
                  {
                    icon: {
                      source: Icon.Calendar,
                      tintColor,
                    },
                  },
                  {
                    text: isVisible ? "Visible" : "Hidden",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={isVisible ? "Hide Calendar" : "Show Calendar"}
                      icon={isVisible ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() => toggleCalendar(cal.id)}
                    />
                    <Action
                      title={isDefault ? "Clear Default" : "Set as Default"}
                      icon={Icon.Star}
                      onAction={() => handleSetDefault(cal.id)}
                    />
                    <ActionPanel.Section>
                      <Action title="Show All Calendars" icon={Icon.Eye} onAction={showAll} />
                      <Action title="Hide All Except Default" icon={Icon.EyeDisabled} onAction={hideAll} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
      {!isLoading && (
        <List.Section title="Summary">
          <List.Item icon={Icon.Info} title={`${visibleCount} of ${totalCount} calendars visible`} />
        </List.Section>
      )}
    </List>
  );
}
