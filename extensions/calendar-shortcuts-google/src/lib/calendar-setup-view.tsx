import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LaunchType,
  Toast,
  environment,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectionCheckView } from "../check-connection";
import {
  CalendarRoleMap,
  CalendarSelectionMode,
  RoutingKeywordMap,
  calendarEntryDisplayName,
  defaultRoleSelections,
  formatKeywordList,
  getCalendarRoles,
  getCalendarSettingsDebugScope,
  getMenuBarEnabledCalendarIds,
  getRoutingKeywords,
  getScheduleEnabledCalendarIds,
  googleVisibleCalendarIds,
  markCalendarSetupComplete,
  parseKeywordList,
  setCalendarRoles,
  setMenuBarEnabledCalendarIds,
  setRoutingKeywords,
  setScheduleEnabledCalendarIds,
} from "./calendar-settings";
import { isWritable, listCalendars } from "./google";
import { GoogleCalendarEntry } from "./types";

const NONE = "__none__";

type SetupStep = 1 | 2 | 3;

type RoleValues = {
  personalCalendar: string;
  workCalendar: string;
  sharedCalendar: string;
  familyCalendar: string;
};

type VisibilityValues = {
  scheduleCalendars: string[];
  menuBarCalendars: string[];
};

type KeywordValues = {
  personalKeywords: string;
  workKeywords: string;
  sharedKeywords: string;
  familyKeywords: string;
};

type SetupDraft = {
  roles: CalendarRoleMap;
  scheduleCalendars: string[];
  menuBarCalendars: string[];
  keywordText: KeywordValues;
};

type Props = {
  onComplete?: () => void | Promise<void>;
};

const EMPTY_KEYWORD_TEXT: KeywordValues = {
  personalKeywords: "",
  workKeywords: "",
  sharedKeywords: "",
  familyKeywords: "",
};

function debugSetup(label: string, payload: unknown): void {
  if (environment.isDevelopment) {
    console.info(`[DayCal setup] ${label}`, payload);
  }
}

function roleMapFromValues(values: RoleValues): CalendarRoleMap {
  return {
    personal: values.personalCalendar,
    ...(values.workCalendar !== NONE ? { work: values.workCalendar } : {}),
    ...(values.sharedCalendar !== NONE
      ? { shared: values.sharedCalendar }
      : {}),
    ...(values.familyCalendar !== NONE
      ? { family: values.familyCalendar }
      : {}),
  };
}

function keywordTextFromMap(keywords: RoutingKeywordMap): KeywordValues {
  return {
    personalKeywords: formatKeywordList(keywords.personal),
    workKeywords: formatKeywordList(keywords.work),
    sharedKeywords: formatKeywordList(keywords.shared),
    familyKeywords: formatKeywordList(keywords.family),
  };
}

function keywordMapFromValues(values: KeywordValues): RoutingKeywordMap {
  return {
    personal: parseKeywordList(values.personalKeywords),
    work: parseKeywordList(values.workKeywords),
    shared: parseKeywordList(values.sharedKeywords),
    family: parseKeywordList(values.familyKeywords),
  };
}

function validatedCalendarIds(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${label} calendar selection was not submitted correctly.`);
  }
  return [...value];
}

function validatedKeywordValues(values: Partial<KeywordValues>): KeywordValues {
  const entries = Object.entries(EMPTY_KEYWORD_TEXT) as Array<
    [keyof KeywordValues, string]
  >;
  for (const [key] of entries) {
    if (typeof values[key] !== "string") {
      throw new Error("A routing keyword field was not submitted correctly.");
    }
  }
  return values as KeywordValues;
}

function sameStringArrays(a: string[] | null, b: string[]): boolean {
  if (!a) return false;
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

function sameRoleMap(a: CalendarRoleMap, b: CalendarRoleMap): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalisedKeywordMap(map: RoutingKeywordMap): RoutingKeywordMap {
  const result: RoutingKeywordMap = {};
  for (const role of ["personal", "work", "shared", "family"] as const) {
    const values = Array.from(
      new Set(
        (map[role] || [])
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    if (values.length) result[role] = values;
  }
  return result;
}

function sameKeywordMap(a: RoutingKeywordMap, b: RoutingKeywordMap): boolean {
  return (
    JSON.stringify(normalisedKeywordMap(a)) ===
    JSON.stringify(normalisedKeywordMap(b))
  );
}

function selectionModeLabel(mode: CalendarSelectionMode): string {
  switch (mode) {
    case "custom":
      return "Custom Enabled Calendars";
    case "google":
      return "Google Calendar Visibility";
    case "all":
      return "All Calendars";
  }
}

async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
      context: { refreshMode: "full" },
    });
  } catch {
    // Non-fatal: the menu bar may be disabled or already relaunching.
  }
}

export function CalendarSetupView({ onComplete }: Props) {
  const preferences = getPreferenceValues();
  const [step, setStep] = useState<SetupStep>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarEntry[]>([]);
  const [draft, setDraft] = useState<SetupDraft>({
    roles: {},
    scheduleCalendars: [],
    menuBarCalendars: [],
    keywordText: EMPTY_KEYWORD_TEXT,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        allCalendars,
        savedRoles,
        savedKeywords,
        existingScheduleEnabled,
        existingMenuBarEnabled,
      ] = await Promise.all([
        listCalendars(),
        getCalendarRoles(),
        getRoutingKeywords(),
        getScheduleEnabledCalendarIds(),
        getMenuBarEnabledCalendarIds(),
      ]);

      const readableCalendars = allCalendars.filter(
        (calendar) => calendar.accessRole !== "none",
      );
      const writableCalendars = readableCalendars.filter(isWritable);
      const visibleCalendarIds = googleVisibleCalendarIds(readableCalendars);
      const loadedDraft: SetupDraft = {
        roles: Object.keys(savedRoles).length
          ? savedRoles
          : defaultRoleSelections(writableCalendars),
        scheduleCalendars: existingScheduleEnabled ?? visibleCalendarIds,
        menuBarCalendars: existingMenuBarEnabled ?? visibleCalendarIds,
        keywordText: keywordTextFromMap(savedKeywords),
      };

      setCalendars(readableCalendars);
      setDraft(loadedDraft);
      setStep(1);

      debugSetup("loaded draft", {
        scope: await getCalendarSettingsDebugScope(),
        roles: loadedDraft.roles,
        scheduleCalendars: loadedDraft.scheduleCalendars,
        menuBarCalendars: loadedDraft.menuBarCalendars,
        keywordFields: Object.fromEntries(
          Object.entries(loadedDraft.keywordText).map(([key, value]) => [
            key,
            { type: typeof value, length: value.length },
          ]),
        ),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const writableCalendars = useMemo(
    () =>
      calendars
        .filter(isWritable)
        .slice()
        .sort((a, b) =>
          calendarEntryDisplayName(a).localeCompare(
            calendarEntryDisplayName(b),
          ),
        ),
    [calendars],
  );

  const readableCalendars = useMemo(
    () =>
      calendars
        .slice()
        .sort((a, b) =>
          calendarEntryDisplayName(a).localeCompare(
            calendarEntryDisplayName(b),
          ),
        ),
    [calendars],
  );

  async function continueFromRoles(values: RoleValues) {
    debugSetup("step 1 submit", {
      fields: Object.fromEntries(
        Object.entries(values || {}).map(([key, value]) => [key, typeof value]),
      ),
      draftRoles: draft.roles,
    });

    if (!values || typeof values.personalCalendar !== "string") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read calendar roles",
        message: "Please try Continue again. Your current choices were kept.",
      });
      return;
    }

    if (values.personalCalendar === NONE) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a Personal calendar",
        message: "Personal is the fallback calendar for Quick Add events.",
      });
      return;
    }

    const nextRoles = roleMapFromValues(values);
    setDraft((current) => ({ ...current, roles: nextRoles }));
    setStep(2);
  }

  async function continueFromVisibility(values: VisibilityValues) {
    debugSetup("step 2 submit", {
      fields: Object.fromEntries(
        Object.entries(values || {}).map(([key, value]) => [
          key,
          Array.isArray(value) ? `array:${value.length}` : typeof value,
        ]),
      ),
      draftScheduleCalendars: draft.scheduleCalendars,
      draftMenuBarCalendars: draft.menuBarCalendars,
    });

    try {
      const scheduleCalendars = validatedCalendarIds(
        values?.scheduleCalendars,
        "Schedule",
      );
      const menuBarCalendars = validatedCalendarIds(
        values?.menuBarCalendars,
        "Menu Bar",
      );

      setDraft((current) => ({
        ...current,
        scheduleCalendars,
        menuBarCalendars,
      }));
      setStep(3);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not read calendar selections",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function save(values: KeywordValues) {
    const personalCalendar = draft.roles.personal;
    if (!personalCalendar) {
      setStep(1);
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a Personal calendar",
      });
      return;
    }

    setIsSaving(true);
    try {
      const submittedKeywordText = validatedKeywordValues(values || {});
      const finalDraft: SetupDraft = {
        ...draft,
        keywordText: submittedKeywordText,
      };
      const keywordMap = keywordMapFromValues(finalDraft.keywordText);
      const scope = await getCalendarSettingsDebugScope();

      debugSetup("save payload", {
        scope,
        roles: finalDraft.roles,
        scheduleCalendars: finalDraft.scheduleCalendars,
        menuBarCalendars: finalDraft.menuBarCalendars,
        keywordFields: Object.fromEntries(
          Object.entries(finalDraft.keywordText).map(([key, value]) => [
            key,
            { type: typeof value, length: value.length },
          ]),
        ),
      });

      await Promise.all([
        setCalendarRoles(finalDraft.roles),
        setRoutingKeywords(keywordMap),
        setScheduleEnabledCalendarIds(finalDraft.scheduleCalendars),
        setMenuBarEnabledCalendarIds(finalDraft.menuBarCalendars),
      ]);

      const [savedRoles, savedKeywords, savedSchedule, savedMenuBar] =
        await Promise.all([
          getCalendarRoles(),
          getRoutingKeywords(),
          getScheduleEnabledCalendarIds(),
          getMenuBarEnabledCalendarIds(),
        ]);

      debugSetup("save read-back", {
        scope,
        roles: savedRoles,
        scheduleCalendars: savedSchedule,
        menuBarCalendars: savedMenuBar,
        keywordCounts: Object.fromEntries(
          Object.entries(savedKeywords).map(([key, list]) => [
            key,
            Array.isArray(list) ? list.length : 0,
          ]),
        ),
      });

      if (
        !sameRoleMap(savedRoles, finalDraft.roles) ||
        !sameStringArrays(savedSchedule, finalDraft.scheduleCalendars) ||
        !sameStringArrays(savedMenuBar, finalDraft.menuBarCalendars) ||
        !sameKeywordMap(savedKeywords, keywordMap)
      ) {
        throw new Error(
          "Calendar setup could not be verified after saving. Your previous setup-complete state was left unchanged.",
        );
      }

      setDraft(finalDraft);
      await markCalendarSetupComplete();
      void refreshMenuBar();

      await showToast({
        style: Toast.Style.Success,
        title: "Calendar setup saved",
        message: "DayCal is ready to use.",
      });
      await onComplete?.();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save calendar setup",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Form navigationTitle="Set Up Your Calendars" isLoading>
        <Form.Description
          title="Loading Google Calendars"
          text="Reading the calendars available to this Google account…"
        />
      </Form>
    );
  }

  if (error) {
    return (
      <Form
        navigationTitle="Set Up Your Calendars"
        actions={
          <ActionPanel>
            <Action
              title="Retry Loading Calendars"
              icon={Icon.ArrowClockwise}
              onAction={() => void load()}
            />
            <Action.Push
              title="Check Google Calendar Connection"
              icon={Icon.Link}
              target={<ConnectionCheckView />}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Could Not Load Google Calendars"
          text={`${error}\n\nYour Raycast Google sign-in is kept separate from DayCal settings. Retry first, or check the connection for more detail.`}
        />
      </Form>
    );
  }

  if (step === 1) {
    return (
      <Form
        navigationTitle="Set Up Your Calendars · 1 of 3"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Continue"
              icon={Icon.ArrowRight}
              onSubmit={continueFromRoles}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="1. Choose Calendar Roles"
          text="Tell DayCal which writable calendar should be used for Personal, Work, Shared / Partner and Family events. Personal is required; the other roles are optional."
        />

        <Form.Dropdown
          id="personalCalendar"
          title="Personal"
          value={draft.roles.personal || NONE}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              roles: {
                ...current.roles,
                personal: value === NONE ? undefined : value,
              },
            }))
          }
        >
          <Form.Dropdown.Item
            value={NONE}
            title="Not Used"
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
          {writableCalendars.map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarEntryDisplayName(calendar)}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
            />
          ))}
        </Form.Dropdown>

        <Form.Dropdown
          id="workCalendar"
          title="Work"
          value={draft.roles.work || NONE}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              roles: {
                ...current.roles,
                work: value === NONE ? undefined : value,
              },
            }))
          }
        >
          <Form.Dropdown.Item
            value={NONE}
            title="Not Used"
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
          {writableCalendars.map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarEntryDisplayName(calendar)}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
            />
          ))}
        </Form.Dropdown>

        <Form.Dropdown
          id="sharedCalendar"
          title="Shared / Partner"
          value={draft.roles.shared || NONE}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              roles: {
                ...current.roles,
                shared: value === NONE ? undefined : value,
              },
            }))
          }
        >
          <Form.Dropdown.Item
            value={NONE}
            title="Not Used"
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
          {writableCalendars.map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarEntryDisplayName(calendar)}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
            />
          ))}
        </Form.Dropdown>

        <Form.Dropdown
          id="familyCalendar"
          title="Family"
          value={draft.roles.family || NONE}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              roles: {
                ...current.roles,
                family: value === NONE ? undefined : value,
              },
            }))
          }
        >
          <Form.Dropdown.Item
            value={NONE}
            title="Not Used"
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
          {writableCalendars.map((calendar) => (
            <Form.Dropdown.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarEntryDisplayName(calendar)}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
            />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }

  if (step === 2) {
    const modeIsCustom = preferences.calendarSelectionMode === "custom";

    return (
      <Form
        navigationTitle="Set Up Your Calendars · 2 of 3"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Continue"
              icon={Icon.ArrowRight}
              onSubmit={continueFromVisibility}
            />
            <Action
              title="Back"
              icon={Icon.ArrowLeft}
              onAction={() => setStep(1)}
            />
          </ActionPanel>
        }
      >
        <Form.Description
          title="2. Choose What You See"
          text={
            modeIsCustom
              ? "Schedule and the Menu Bar can show different calendars. Choose the calendars you want in each place."
              : `Your Calendar Selection Mode is currently “${selectionModeLabel(preferences.calendarSelectionMode)}”. These custom selections will still be saved and will be ready if you switch to Custom Enabled Calendars later.`
          }
        />

        <Form.TagPicker
          id="scheduleCalendars"
          title="Schedule Calendars"
          placeholder="Choose calendars for Schedule"
          value={draft.scheduleCalendars}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              scheduleCalendars: value,
            }))
          }
        >
          {readableCalendars.map((calendar) => (
            <Form.TagPicker.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarEntryDisplayName(calendar)}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
            />
          ))}
        </Form.TagPicker>

        <Form.TagPicker
          id="menuBarCalendars"
          title="Menu Bar Calendars"
          placeholder="Choose calendars for the Menu Bar"
          value={draft.menuBarCalendars}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              menuBarCalendars: value,
            }))
          }
        >
          {readableCalendars.map((calendar) => (
            <Form.TagPicker.Item
              key={calendar.id}
              value={calendar.id}
              title={calendarEntryDisplayName(calendar)}
              icon={{
                source: Icon.Circle,
                tintColor: calendar.backgroundColor || Color.SecondaryText,
              }}
            />
          ))}
        </Form.TagPicker>
      </Form>
    );
  }

  return (
    <Form
      navigationTitle="Set Up Your Calendars · 3 of 3"
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Finish Setup"
            icon={Icon.Checkmark}
            onSubmit={save}
          />
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            onAction={() => setStep(2)}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="3. Optional Routing Keywords"
        text="Add names or words that are specific to you. Separate multiple keywords with commas. Generic rules such as dentist → Personal and client → Work are already included, so you can leave these blank."
      />

      <Form.TextField
        id="personalKeywords"
        title="Personal Keywords"
        value={draft.keywordText.personalKeywords}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            keywordText: { ...current.keywordText, personalKeywords: value },
          }))
        }
        placeholder="e.g. Study"
      />
      <Form.TextField
        id="workKeywords"
        title="Work Keywords"
        value={draft.keywordText.workKeywords}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            keywordText: { ...current.keywordText, workKeywords: value },
          }))
        }
        placeholder="e.g. Acme, project codename"
      />
      <Form.TextField
        id="sharedKeywords"
        title="Shared Keywords"
        value={draft.keywordText.sharedKeywords}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            keywordText: { ...current.keywordText, sharedKeywords: value },
          }))
        }
        placeholder="e.g. partner's name"
      />
      <Form.TextField
        id="familyKeywords"
        title="Family Keywords"
        value={draft.keywordText.familyKeywords}
        onChange={(value) =>
          setDraft((current) => ({
            ...current,
            keywordText: { ...current.keywordText, familyKeywords: value },
          }))
        }
        placeholder="e.g. family surname"
      />

      <Form.Separator />
      <Form.Description
        title="Raycast Preferences"
        text="Schedule range, the app used to open Google Calendar, declined-event handling, Calendar Selection Mode and Menu Bar headline/timing remain normal Raycast extension preferences. You can change them at any time with ⌘⇧P."
      />
    </Form>
  );
}
