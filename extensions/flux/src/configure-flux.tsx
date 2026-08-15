import { Form, ActionPanel, Action, showToast, closeMainWindow } from "@raycast/api";
import {
  OPTS_FAST_TRANSITIONS,
  OPTS_SLEEP_IN_ON_WEEKENDS,
  OPTS_EXPANDED_DAYTIME_SETTINGS,
  OPTS_DIM_ON_DISABLE,
  OPTS_NOTIFICATIONS_FROM_FLUX_WEBSITE,
  OPTS_BACKWARDS_ALARM_CLOCK,
  COLOR_EFFECT_DARKROOM,
  COLOR_EFFECT_MOVIE_MODE,
  COLOR_EFFECT_DARK_THEME_AT_SUNSET,
  OptionsAction,
  ColorEffect,
  toggleOption,
  setColorEffect,
  getMenuStates,
} from "./flux-api";
import { DEFAULT_ERROR_TOAST } from "./constants";
import { useEffect, useState } from "react";

type Values = {
  fastTransitions: boolean;
  sleepInOnWeekends: boolean;
  expandedDaytimeSettings: boolean;
  dimOnDisable: boolean;
  notificationsFromFluxWebsite: boolean;
  backwardsAlarmClock: boolean;
  darkroom: boolean;
  movieMode: boolean;
  darkThemeAtSunset: boolean;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [menuStates, setMenuStates] = useState<Values>({
    fastTransitions: false,
    sleepInOnWeekends: false,
    expandedDaytimeSettings: false,
    dimOnDisable: false,
    notificationsFromFluxWebsite: false,
    backwardsAlarmClock: false,
    darkroom: false,
    movieMode: false,
    darkThemeAtSunset: false,
  });

  async function loadMenuStates() {
    try {
      const menuStates = await getMenuStates();
      setMenuStates({
        fastTransitions: (menuStates.get(OPTS_FAST_TRANSITIONS) ?? 0) === 1,
        sleepInOnWeekends: (menuStates.get(OPTS_SLEEP_IN_ON_WEEKENDS) ?? 0) === 1,
        expandedDaytimeSettings: (menuStates.get(OPTS_EXPANDED_DAYTIME_SETTINGS) ?? 0) === 1,
        dimOnDisable: (menuStates.get(OPTS_DIM_ON_DISABLE) ?? 0) === 1,
        notificationsFromFluxWebsite: (menuStates.get(OPTS_NOTIFICATIONS_FROM_FLUX_WEBSITE) ?? 0) === 1,
        backwardsAlarmClock: (menuStates.get(OPTS_BACKWARDS_ALARM_CLOCK) ?? 0) === 1,
        darkroom: (menuStates.get(COLOR_EFFECT_DARKROOM) ?? 0) === 1,
        movieMode: (menuStates.get(COLOR_EFFECT_MOVIE_MODE) ?? 0) === 1,
        darkThemeAtSunset: (menuStates.get(COLOR_EFFECT_DARK_THEME_AT_SUNSET) ?? 0) === 1,
      });
    } catch {
      await showToast(DEFAULT_ERROR_TOAST);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOnChange(id: keyof Values) {
    return (value: boolean) => {
      setMenuStates((prevStates) => ({
        ...prevStates,
        [id]: value,
      }));
    };
  }

  async function handleSubmit(values: Values) {
    await closeMainWindow();
    let hasError = false;

    try {
      const menuStates = await getMenuStates();
      const optionChanges = [
        {
          key: OPTS_FAST_TRANSITIONS,
          value: values.fastTransitions,
          option: OptionsAction.FastTransitions,
        },
        {
          key: OPTS_SLEEP_IN_ON_WEEKENDS,
          value: values.sleepInOnWeekends,
          option: OptionsAction.SleepInOnWeekends,
        },
        {
          key: OPTS_EXPANDED_DAYTIME_SETTINGS,
          value: values.expandedDaytimeSettings,
          option: OptionsAction.ExpandedDaytimeSettings,
        },
        {
          key: OPTS_DIM_ON_DISABLE,
          value: values.dimOnDisable,
          option: OptionsAction.DimOnDisable,
        },
        {
          key: OPTS_NOTIFICATIONS_FROM_FLUX_WEBSITE,
          value: values.notificationsFromFluxWebsite,
          option: OptionsAction.NotificationsFromFluxWebsite,
        },
        {
          key: OPTS_BACKWARDS_ALARM_CLOCK,
          value: values.backwardsAlarmClock,
          option: OptionsAction.BackwardsAlarmClock,
        },
      ];

      for (const change of optionChanges) {
        const currValue = (menuStates.get(change.key) ?? 0) === 1;

        if (change.value !== currValue) {
          const success = await toggleOption(change.option);

          if (!success) {
            hasError = true;
          }
        }
      }

      const colorEffectChanges = [
        {
          key: COLOR_EFFECT_DARK_THEME_AT_SUNSET,
          value: values.darkThemeAtSunset,
          effect: ColorEffect.DarkThemeAtSunset,
        },
      ];

      for (const change of colorEffectChanges) {
        const currValue = (menuStates.get(change.key) ?? 0) === 1;

        if (change.value !== currValue) {
          const success = await setColorEffect(change.effect);

          if (!success) {
            hasError = true;
          }
        }
      }

      if (hasError) {
        await showToast(DEFAULT_ERROR_TOAST);
      } else {
        await showToast({ title: "f.lux settings updated" });
      }
    } catch {
      await showToast(DEFAULT_ERROR_TOAST);
    }
  }

  useEffect(() => {
    loadMenuStates().catch(async () => {
      await showToast(DEFAULT_ERROR_TOAST);
    });
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="fastTransitions"
        label={OptionsAction.FastTransitions}
        onChange={handleOnChange("fastTransitions")}
        value={menuStates.fastTransitions}
      />
      <Form.Checkbox
        id="sleepInOnWeekends"
        label={OptionsAction.SleepInOnWeekends}
        onChange={handleOnChange("sleepInOnWeekends")}
        value={menuStates.sleepInOnWeekends}
      />
      <Form.Checkbox
        id="expandedDaytimeSettings"
        label={OptionsAction.ExpandedDaytimeSettings}
        onChange={handleOnChange("expandedDaytimeSettings")}
        value={menuStates.expandedDaytimeSettings}
      />
      <Form.Checkbox
        id="dimOnDisable"
        label={OptionsAction.DimOnDisable}
        onChange={handleOnChange("dimOnDisable")}
        value={menuStates.dimOnDisable}
      />
      <Form.Checkbox
        id="notificationsFromFluxWebsite"
        label={OptionsAction.NotificationsFromFluxWebsite}
        onChange={handleOnChange("notificationsFromFluxWebsite")}
        value={menuStates.notificationsFromFluxWebsite}
      />
      <Form.Checkbox
        id="backwardsAlarmClock"
        label={OptionsAction.BackwardsAlarmClock}
        onChange={handleOnChange("backwardsAlarmClock")}
        value={menuStates.backwardsAlarmClock}
      />
      <Form.Checkbox
        id="darkThemeAtSunset"
        label="macOS Dark theme at sunset"
        onChange={handleOnChange("darkThemeAtSunset")}
        value={menuStates.darkThemeAtSunset}
      />
    </Form>
  );
}
