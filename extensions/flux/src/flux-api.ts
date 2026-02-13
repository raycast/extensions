import { runAppleScript } from "@raycast/utils";

type TopLevel = "About f.lux" | "f.lux is off" | "Preferences..." | "Quit f.lux";
type ActionOption = "Disable" | "Color Effects" | "Options";

export enum DisableDuration {
  ForAnHour = "for an hour",
  UntilSunrise = "until sunrise",
  ForFullScreenApps = "for full-screen apps",
  ForCurrentApp = "for current app",
}

export enum ColorEffect {
  Darkroom = "Darkroom",
  MovieMode = "Movie mode",
  DarkThemeAtSunset = "macOS Dark theme at sunset",
}

export enum OptionsAction {
  FastTransitions = "Fast transitions",
  SleepInOnWeekends = "Sleep in on weekends",
  ExpandedDaytimeSettings = "Expanded daytime settings",
  DimOnDisable = "Dim on disable",
  NotificationsFromFluxWebsite = "Notifications from f.lux website",
  BackwardsAlarmClock = "Backwards alarm clock",
}

type MenuSpec = TopLevel | ["Options", OptionsAction] | ["Color Effects", ColorEffect] | ["Disable", DisableDuration];

export const OPTS_FAST_TRANSITIONS: MenuSpec = ["Options", OptionsAction.FastTransitions];
export const OPTS_SLEEP_IN_ON_WEEKENDS: MenuSpec = ["Options", OptionsAction.SleepInOnWeekends];
export const OPTS_EXPANDED_DAYTIME_SETTINGS: MenuSpec = ["Options", OptionsAction.ExpandedDaytimeSettings];
export const OPTS_DIM_ON_DISABLE: MenuSpec = ["Options", OptionsAction.DimOnDisable];
export const OPTS_NOTIFICATIONS_FROM_FLUX_WEBSITE: MenuSpec = ["Options", OptionsAction.NotificationsFromFluxWebsite];
export const OPTS_BACKWARDS_ALARM_CLOCK: MenuSpec = ["Options", OptionsAction.BackwardsAlarmClock];
export const COLOR_EFFECT_DARKROOM: MenuSpec = ["Color Effects", ColorEffect.Darkroom];
export const COLOR_EFFECT_MOVIE_MODE: MenuSpec = ["Color Effects", ColorEffect.MovieMode];
export const COLOR_EFFECT_DARK_THEME_AT_SUNSET: MenuSpec = ["Color Effects", ColorEffect.DarkThemeAtSunset];
export const DISABLE_FOR_AN_HOUR: MenuSpec = ["Disable", DisableDuration.ForAnHour];
export const DISABLE_UNTIL_SUNRISE: MenuSpec = ["Disable", DisableDuration.UntilSunrise];
export const DISABLE_FOR_FULL_SCREEN_APPS: MenuSpec = ["Disable", DisableDuration.ForFullScreenApps];

/**
 * Strip quotes from a string
 *
 * @param str
 */
function nq(str: string) {
  return str.replaceAll('"', "");
}

function scpt_fluxScope(body: string) {
  return `
    tell application "System Events"
      try
        tell application process "Flux"
          ${body}
        end tell
      on error
        return 1
      end try
    end tell
  `;
}

function scpt_menuHelper(name: string) {
  return `menu item "${name}" of menu 1 of menu bar item 1 of menu bar 2`;
}

function scpt_subMenuHelper(parentMenu: string, childMenu: string) {
  return `menu item "${childMenu}" of menu 1 of menu item "${parentMenu}" of menu 1 of menu bar item 1 of menu bar 2`;
}

const scpt_getMenuCheckedHelper = () => `
  on getMenuCheckedStates(menuSpecs)
    tell application "System Events"
      tell application process "Flux"
        set results to {}
        
        repeat with spec in menuSpecs
          try
            if (count of spec) is 1 then
              set mi to ${nq(scpt_menuHelper("(item 1 of spec)"))}
            else
              set mi to ${nq(scpt_subMenuHelper("(item 1 of spec)", "(item 2 of spec)"))}
            end if
              
            set markChar to value of attribute "AXMenuItemMarkChar" of mi
            
            if markChar is "✓" then
              set end of results to 1
            else
              set end of results to 0
            end if
          on error
            set end of results to -1
          end try
        end repeat
        
        set AppleScript's text item delimiters to ","
        set resultString to results as text
        set AppleScript's text item delimiters to ""
        
        return resultString        
      end tell
    end tell
  end getMenuCheckedStates
`;

function scpt_clickTopMenu(action: TopLevel) {
  return scpt_fluxScope(`
    click ${scpt_menuHelper(action)}
    
    return 0
  `);
}

function scpt_clickSubMenu(action: ActionOption, secondAction: ColorEffect | DisableDuration | OptionsAction) {
  return scpt_fluxScope(`
    click ${scpt_subMenuHelper(action, secondAction)}

    return 0
  `);
}

async function as_clickMenu(action: MenuSpec) {
  return (
    (await runAppleScript(
      typeof action === "string" ? scpt_clickTopMenu(action) : scpt_clickSubMenu(action[0], action[1]),
    )) === "0"
  );
}

export async function getMenuStates() {
  const menuSpecs: MenuSpec[] = [
    OPTS_FAST_TRANSITIONS,
    OPTS_SLEEP_IN_ON_WEEKENDS,
    OPTS_EXPANDED_DAYTIME_SETTINGS,
    OPTS_DIM_ON_DISABLE,
    OPTS_NOTIFICATIONS_FROM_FLUX_WEBSITE,
    OPTS_BACKWARDS_ALARM_CLOCK,
    COLOR_EFFECT_DARKROOM,
    COLOR_EFFECT_MOVIE_MODE,
    COLOR_EFFECT_DARK_THEME_AT_SUNSET,
    DISABLE_FOR_AN_HOUR,
    DISABLE_UNTIL_SUNRISE,
    DISABLE_FOR_FULL_SCREEN_APPS,
  ];
  const options = new Map<MenuSpec, number>();
  const statesScpt = `
    ${scpt_getMenuCheckedHelper()}

    return getMenuCheckedStates({ ¬
      ${menuSpecs
        .map((menuSpec) => {
          return `{"${Array.isArray(menuSpec) ? menuSpec.join('","') : menuSpec}"}`;
        })
        .join(",")} ¬
    })
  `;
  const states = (await runAppleScript(statesScpt)).split(",");

  menuSpecs.forEach((menuSpec, index) => {
    options.set(menuSpec, parseInt(states[index], 10));
  });

  return options;
}

export async function getMenuState(option: MenuSpec): Promise<number> {
  const options = await getMenuStates();

  return options.get(option) ?? -1;
}

export async function openPreferences(): Promise<boolean> {
  return await as_clickMenu("Preferences...");
}

export async function toggleOption(option: OptionsAction): Promise<boolean> {
  return await as_clickMenu(["Options", option]);
}

export async function setColorEffect(effect: ColorEffect): Promise<boolean> {
  return await as_clickMenu(["Color Effects", effect]);
}

export async function disableFluxForDuration(duration: DisableDuration): Promise<boolean> {
  return await as_clickMenu(["Disable", duration]);
}

export async function quitFlux(): Promise<boolean> {
  return await as_clickMenu("Quit f.lux");
}
