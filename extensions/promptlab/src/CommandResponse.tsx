import {
  Clipboard,
  closeMainWindow,
  Detail,
  getFrontmostApplication,
  getSelectedText,
  List,
  LocalStorage,
  showToast,
  Toast,
  useUnstableAI,
} from "@raycast/api";
import { ERRORTYPE, useFileContents } from "./utils/file-utils";
import ResponseActions from "./ResponseActions";
import * as os from "os";
import * as fs from "fs";
import { useEffect, useState } from "react";
import {
  CalendarDuration,
  filterString,
  getCurrentDate,
  getCurrentTime,
  getUpcomingCalendarEvents,
} from "./utils/calendar-utils";
import {
  getTextOfWebpage,
  getCurrentURL,
  SupportedBrowsers,
  getTrackNames,
  getCurrentTrack,
  getLastNote,
  getInstalledApplications,
  getLastEmail,
  getSafariTopSites,
  getJSONResponse,
  getWeatherData,
  getComputerName,
  getSafariBookmarks,
} from "./utils/context-utils";
import { CommandOptions } from "./utils/types";
import { runAppleScript } from "run-applescript";
import { runActionScript } from "./utils/command-utils";

export default function CommandResponse(props: { commandName: string; prompt: string; options: CommandOptions }) {
  const { commandName, prompt, options } = props;
  const [substitutedPrompt, setSubstitutedPrompt] = useState<string>(prompt);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const { selectedFiles, contentPrompts, loading, errorType } =
    options.minNumFiles != undefined && options.minNumFiles > 0
      ? useFileContents(options)
      : { selectedFiles: [], contentPrompts: [], loading: false, errorType: undefined };

  const replacements: { [key: string]: () => Promise<string> } = {
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
      const app = await getFrontmostApplication();
      return app.name;
    },
    "{{currentTabText}}": async () => {
      const app = await getFrontmostApplication();
      if (SupportedBrowsers.includes(app.name)) {
        const URL = await getCurrentURL(app.name);
        const URLText = await getTextOfWebpage(URL);
        return filterString(URLText);
      }
      return "";
    },
    "{{currentURL}}": async () => {
      const app = await getFrontmostApplication();
      if (SupportedBrowsers.includes(app.name)) {
        const URL = await getCurrentURL(app.name);
        return URL;
      }
      return "";
    },
    "{{selectedText}}": async () => {
      try {
        return (await getSelectedText()).substring(0, 3000);
      } catch {
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
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.DAY));
    },
    "{{weekReminders}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.WEEK));
    },
    "{{monthReminders}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.MONTH));
    },
    "{{yearReminders}}": async () => {
      return filterString(await getUpcomingCalendarEvents(CalendarDuration.YEAR));
    },
  };

  useEffect(() => {
    if (options.showResponse == false) {
      closeMainWindow();
    }

    const runReplacements = async (): Promise<string> => {
      let subbedPrompt = prompt;
      for (const key in replacements) {
        if (prompt.includes(key)) {
          subbedPrompt = subbedPrompt.replaceAll(key, await replacements[key]());
        }
      }

      // Replace script placeholders with their output
      const codeMatches = prompt.match(/{{{(.*[\s\n\r]*)*}}}/g) || [];
      for (const m of codeMatches) {
        const script = m.substring(3, m.length - 3);
        const output = await runAppleScript(script);
        subbedPrompt = filterString(subbedPrompt.replaceAll(m, output));
      }

      // Replace URL placeholders with the website's visible text
      const matches = prompt.match(/{{(https?:.*?)}}/g) || [];
      for (const m of matches) {
        const url = m.substring(2, m.length - 2);
        const text = await getTextOfWebpage(url);
        subbedPrompt = subbedPrompt.replaceAll(m, filterString(text));
      }

      return subbedPrompt;
    };

    Promise.resolve(runReplacements()).then((subbedPrompt) => {
      setLoadingData(false);

      if (options.outputKind == "list") {
        subbedPrompt +=
          "<Format the output as a single list with each item separated by '~~~'. Do not provide any other commentary, headings, or data.>";
      }

      setSubstitutedPrompt(subbedPrompt);
    });
  }, []);

  const contentPromptString = contentPrompts.join("\n");
  const fullPrompt = (substitutedPrompt.replaceAll("{{contents}}", contentPromptString) + contentPromptString).replace(
    /{{END}}(\n|.)*/,
    ""
  );
  const { data, isLoading, revalidate } = useUnstableAI(fullPrompt, {
    execute:
      !loadingData && ((options.minNumFiles != undefined && options.minNumFiles == 0) || contentPrompts.length > 0),
  });

  useEffect(() => {
    if (data && !isLoading && options.actionScript != undefined && options.actionScript.trim().length > 0) {
      Promise.resolve(runActionScript(options.actionScript, data));
    }
  }, [data, isLoading]);

  if (errorType) {
    let errorMessage = "";
    if (errorType == ERRORTYPE.FINDER_INACTIVE) {
      errorMessage = "Can't get selected files";
    } else if (errorType == ERRORTYPE.MIN_SELECTION_NOT_MET) {
      errorMessage = `Must select at least ${options.minNumFiles} file${options.minNumFiles == 1 ? "" : "s"}`;
    } else if (errorType == ERRORTYPE.INPUT_TOO_LONG) {
      errorMessage = "Input too large";
    }

    showToast({
      title: "Failed Error Detection",
      message: errorMessage,
      style: Toast.Style.Failure,
    });
    return null;
  }

  const text = `${options.outputKind == "detail" || options.outputKind == undefined ? `# ${commandName}\n` : ``}${
    data
      ? data
      : options.minNumFiles != undefined && options.minNumFiles == 0
      ? "Loading response..."
      : "Analyzing files..."
  }`;

  if (options.showResponse == false) {
    return null;
  }

  if (options.outputKind == "list") {
    return (
      <List
        isLoading={
          loading ||
          isLoading ||
          loadingData ||
          (options.minNumFiles != undefined && options.minNumFiles != 0 && contentPrompts.length == 0)
        }
        navigationTitle={commandName}
        actions={
          <ResponseActions
            commandSummary="Response"
            responseText={text}
            promptText={fullPrompt}
            reattempt={revalidate}
            files={selectedFiles}
          />
        }
      >
        {text
          .split("~~~")
          .filter((item) => {
            return item.match(/^[\S]*.*$/g) != undefined;
          })
          .map((item, index) => (
            <List.Item
              title={item.trim()}
              key={`item${index}`}
              actions={
                <ResponseActions
                  commandSummary="Response"
                  responseText={text}
                  promptText={fullPrompt}
                  reattempt={revalidate}
                  files={selectedFiles}
                  listItem={item.trim()}
                />
              }
            />
          ))}
      </List>
    );
  }

  return (
    <Detail
      isLoading={
        loading ||
        isLoading ||
        loadingData ||
        (options.minNumFiles != undefined && options.minNumFiles != 0 && contentPrompts.length == 0)
      }
      markdown={text}
      navigationTitle={commandName}
      actions={
        <ResponseActions
          commandSummary="Response"
          responseText={text}
          promptText={fullPrompt}
          reattempt={revalidate}
          files={selectedFiles}
        />
      }
    />
  );
}
