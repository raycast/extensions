import { Clipboard, LocalStorage, getSelectedText } from "@raycast/api";
import {
  SupportedBrowsers,
  getComputerName,
  getCurrentDirectory,
  getCurrentTrack,
  getCurrentURL,
  getInstalledApplications,
  getJSONResponse,
  getLastEmail,
  getLastNote,
  getMenubarOwningApplication,
  getSafariBookmarks,
  getSafariTopSites,
  getTextOfWebpage,
  getTrackNames,
  getWeatherData,
} from "../utils/context-utils";
import {
  CalendarDuration,
  filterString,
  getCurrentDate,
  getCurrentTime,
  getUpcomingCalendarEvents,
  getUpcomingReminders,
} from "../utils/calendar-utils";
import * as fs from "fs";
import * as os from "os";

export const useReplacements = (
  input: string | undefined,
  selectedFiles: string[] | undefined
): { [key: string]: () => Promise<string> } => {
  return {
    "{{input}}": async () => {
      return input || (await getSelectedText()).substring(0, 3000);
    },

    // File Data
    "{{files}}": async () => {
      return selectedFiles ? selectedFiles?.join(", ") : "";
    },
    "{{fileNames}}": async () => {
      return selectedFiles ? selectedFiles.map((path) => path.split("/").at(-1)).join(", ") : "";
    },
    "{{metadata}}": async () => {
      return selectedFiles
        ? selectedFiles
            .map(
              (path) =>
                `${path}:\n${Object.entries(fs.lstatSync(path))
                  .map((entry) => `${entry[0]}:entry[1]`)
                  .join("\n")}`
            )
            .join("\n\n")
        : "";
    },
    "{{user}}": async () => {
      return os.userInfo().username;
    },
    "{{homedir}}": async () => {
      return os.userInfo().homedir;
    },
    "{{computerName}}": async () => {
      return await getComputerName();
    },
    "{{hostname}}": async () => {
      return os.hostname();
    },

    // Context Data
    "{{currentApplication}}": async () => {
      return await getMenubarOwningApplication();
    },
    "{{currentTabText}}": async () => {
      const app = await getMenubarOwningApplication();
      if (SupportedBrowsers.includes(app)) {
        const URL = await getCurrentURL(app);
        const URLText = await getTextOfWebpage(URL);
        return filterString(URLText);
      }
      return "";
    },
    "{{currentURL}}": async () => {
      const app = await getMenubarOwningApplication();
      if (SupportedBrowsers.includes(app)) {
        const URL = await getCurrentURL(app);
        return URL;
      }
      return "";
    },
    "{{selectedText}}": async () => {
      try {
        return (await getSelectedText()).substring(0, 3000);
      } catch (error) {
        return "";
      }
    },
    "{{clipboardText}}": async () => {
      const text = filterString((await Clipboard.readText()) as string);
      return text;
    },
    "{{musicTracks}}": async () => {
      const tracks = filterString(await getTrackNames());
      return tracks;
    },
    "{{currentTrack}}": async () => {
      const currentTrack = await getCurrentTrack();
      return currentTrack;
    },
    "{{lastNote}}": async () => {
      const lastNote = filterString(await getLastNote());
      return lastNote;
    },
    "{{lastEmail}}": async () => {
      const lastEmail = filterString(await getLastEmail());
      return lastEmail;
    },
    "{{installedApps}}": async () => {
      const apps = filterString(filterString(await getInstalledApplications()));
      return apps;
    },
    "{{fileAICommands}}": async () => {
      const storedItems = await LocalStorage.allItems();
      const commands = filterString(Object.keys(storedItems).join(", "));
      return commands;
    },
    "{{safariTopSites}}": async () => {
      const topSites = await getSafariTopSites();
      return topSites;
    },
    "{{safariBookmarks}}": async () => {
      const bookmarks = await getSafariBookmarks();
      return bookmarks;
    },
    "{{currentDirectory}}": async () => {
      return await getCurrentDirectory();
    },

    // API Data
    "{{location}}": async () => {
      const jsonObj = getJSONResponse("https://get.geojs.io/v1/ip/geo.json");
      const city = jsonObj["city"];
      const region = jsonObj["region"];
      const country = jsonObj["country"];
      const location = `${city}, ${region}, ${country}`;
      return location;
    },
    "{{todayWeather}}": async () => {
      const weatherData = getWeatherData(1);
      return weatherData as unknown as string;
    },
    "{{weekWeather}}": async () => {
      const weatherData = getWeatherData(7);
      return weatherData as unknown as string;
    },

    // Calendar Data
    "{{date}}": async () => {
      return getCurrentDate();
    },
    "{{currentTime}}": async () => {
      return getCurrentTime();
    },
    "{{todayEvents}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.DAY));
    },
    "{{weekEvents}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.WEEK));
    },
    "{{monthEvents}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.MONTH));
    },
    "{{yearEvents}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.YEAR));
    },
    "{{todayReminders}}": async () => {
      return filterString(await getUpcomingReminders(CalendarDuration.DAY));
    },
    "{{weekReminders}}": async () => {
      return filterString(await getUpcomingReminders(CalendarDuration.WEEK));
    },
    "{{monthReminders}}": async () => {
      return filterString(await getUpcomingReminders(CalendarDuration.MONTH));
    },
    "{{yearReminders}}": async () => {
      return filterString(await getUpcomingReminders(CalendarDuration.YEAR));
    },
  };
};
