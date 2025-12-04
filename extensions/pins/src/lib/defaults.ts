/**
 * @module lib/defaults.ts Default pins and groups, along with logic for installing them.
 *
 * @summary Utilities and data for install default pins and groups into local storage.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-03 12:43:31
 * Last modified  : 2024-07-05 01:56:56
 */

import { LocalStorage, showToast, Toast } from "@raycast/api";

import { StorageKey } from "./constants";
import { getNextGroupID, Group } from "./Groups";
import { getNextPinID, Pin } from "./Pins";
import { getStorage, setStorage } from "./storage";

/**
 * A set of example pins and groups to help users get started.
 */
const examplePins: Pin[] = [
  {
    id: 1,
    name: "Google",
    url: "https://google.com",
    icon: "Favicon / File Icon",
    group: "None",
    application: "None",
  },
  {
    id: 2,
    name: "GitHub",
    url: "https://github.com",
    icon: "Favicon / File Icon",
    group: "Dev Utils",
    application: "None",
  },
  {
    id: 3,
    name: "Regex 101",
    url: "https://regex101.com",
    icon: "Favicon / File Icon",
    group: "Dev Utils",
    application: "None",
  },
  {
    id: 4,
    name: "Terminal",
    url: "/System/Applications/Utilities/Terminal.app",
    icon: "Favicon / File Icon",
    group: "Dev Utils",
    application: "None",
    tags: ["terminal"],
  },
  {
    id: 5,
    name: "New Folder Here",
    url: `osascript -e 'tell application "Finder"' -e 'set dirPath to folder (POSIX file "{{currentDirectory}}" as alias)' -e 'set newFolder to make new folder at dirPath' -e 'select newFolder' -e 'end tell'`,
    icon: "NewFolder",
    group: "Scripts",
    application: "None",
    execInBackground: true,
  },
  {
    id: 6,
    name: "New File Here",
    url: `osascript -e 'tell application "Finder"' -e 'set dirPath to folder (POSIX file "{{currentDirectory}}" as alias)' -e 'set newFile to make new file at dirPath' -e 'select newFile' -e 'end tell'`,
    icon: "NewDocument",
    group: "Scripts",
    application: "None",
    execInBackground: true,
  },
  {
    id: 7,
    name: "New Terminal Here",
    url: `cd {{currentDirectory}}`,
    icon: "Terminal",
    group: "Scripts",
    application: "None",
  },
  {
    id: 8,
    name: "ChatGPT",
    url: "https://chat.openai.com",
    icon: "Favicon / File Icon",
    group: "None",
    application: "None",
  },
  {
    id: 9,
    name: "Random Duck",
    url: "https://random-d.uk",
    icon: "Favicon / File Icon",
    group: "None",
    application: "None",
  },
  {
    id: 10,
    name: "Search On Google",
    url: "https://www.google.com/search?q={{selectedText}}",
    icon: "Favicon / File Icon",
    group: "None",
    application: "None",
  },
  {
    id: 11,
    name: "Raycast Developer Docs",
    url: "https://developers.raycast.com",
    icon: "Favicon / File Icon",
    group: "Raycast Stuff",
    application: "None",
  },
  {
    id: 12,
    name: "Raycast Script Commands",
    url: "https://github.com/raycast/script-commands",
    icon: "Favicon / File Icon",
    group: "Raycast Stuff",
    application: "None",
  },
  {
    id: 13,
    name: "Raycast Store",
    url: "https://www.raycast.com/store",
    icon: "Favicon / File Icon",
    group: "Raycast Stuff",
    application: "None",
  },
  {
    id: 14,
    name: "AI Joke",
    url: "{{alert:{{AI:Tell me a joke}}}}",
    icon: "Emoji",
    group: "Raycast AI Examples",
    application: "None",
    iconColor: "raycast-green",
    tags: ["AI"],
  },
  {
    id: 15,
    name: "Summarize Tab",
    url: '{{alert title="Tab Summary":{{AI:Summarize the following content sourced from {{currentURL}}: ###{{currentTabText}}###}}}}',
    icon: "Network",
    group: "Raycast AI Examples",
    application: "None",
    tags: ["AI", "selection"],
  },
  {
    id: 16,
    name: "Summarize Clipboard",
    url: '{{alert title="Clipboard Summary":{{AI:Summarize this: ###{{clipboardText}}###}}}}',
    icon: "Clipboard",
    group: "Raycast AI Examples",
    application: "None",
    tags: ["AI"],
  },
  {
    id: 17,
    name: "Date: {{date}}",
    url: "{{copy:{{date}}}}",
    icon: "Calendar",
    group: "Placeholder Examples",
    application: "None",
  },
  {
    id: 18,
    name: "Day: {{day}}",
    url: "{{copy:{{day}}}}",
    icon: "Calendar",
    group: "Placeholder Examples",
    application: "None",
  },
  {
    id: 19,
    name: "Time: {{time}}",
    url: "{{copy:{{time}}}}",
    icon: "Clock",
    group: "Placeholder Examples",
    application: "None",
  },
  {
    id: 20,
    name: "Reopen Last Application",
    url: "open -a '{{previousApplication}}'",
    icon: "RotateAntiClockwise",
    group: "Placeholder Examples",
    application: "None",
    execInBackground: true,
  },
  {
    id: 21,
    name: "Summarize Selected Text",
    url: '{{alert title="Selected Text Summary":{{AI:Summarize this: ###{{selectedText}}###}}}}',
    icon: "Text",
    group: "Raycast AI Examples",
    application: "None",
    tags: ["AI", "selection"],
  },
  {
    id: 22,
    name: "Copy Address",
    url: "{{copy:{{address}}}}",
    icon: "House",
    group: "Placeholder Examples",
    application: "None",
  },
  {
    id: 23,
    name: "Paste UUID",
    url: "{{paste:{{uuid}}}}",
    icon: "Number27",
    group: "Placeholder Examples",
    application: "None",
  },
];

const exampleGroups: Group[] = [
  {
    id: 1,
    name: "Dev Utils",
    icon: "CodeBlock",
  },
  {
    id: 2,
    name: "Scripts",
    icon: "Text",
    iconColor: "raycast-orange",
  },
  {
    id: 3,
    name: "Raycast Stuff",
    icon: "RaycastLogoNeg",
    iconColor: "raycast-red",
    parent: 1,
  },
  {
    id: 4,
    name: "Placeholder Examples",
    icon: "Bolt",
    iconColor: "raycast-blue",
  },
  {
    id: 5,
    name: "Raycast AI Examples",
    icon: "Stars",
    iconColor: "raycast-purple",
    parent: 4,
  },
];

/**
 * Imports default pins and groups into local storage.
 */
export const installExamples = async (kind: "pins" | "groups") => {
  if (kind == "pins") {
    const storedPins: Pin[] = (await getStorage(StorageKey.LOCAL_PINS)) || [];

    let nextPinID = await getNextPinID();
    const examplesWithValidIDs = examplePins
      .map((pin) => {
        if (pin.id < nextPinID) {
          pin.id = nextPinID;
          nextPinID++;
        }
        pin.dateCreated = new Date().toUTCString();
        return pin;
      })
      .filter((pin) => !storedPins.some((storedPin) => storedPin.url == pin.url));

    const allPins = [...storedPins, ...examplesWithValidIDs];
    await setStorage(StorageKey.LOCAL_PINS, allPins);
    await LocalStorage.setItem(StorageKey.EXAMPLE_PINS_INSTALLED, true);
  }

  const storedGroups: Group[] = (await getStorage(StorageKey.LOCAL_GROUPS)) || [];

  let nextGroupID = await getNextGroupID();
  const examplesWithValidIDs = exampleGroups
    .map((group) => {
      if (group.id < nextGroupID) {
        group.id = nextGroupID;
        nextGroupID++;
      }
      group.dateCreated = new Date().toUTCString();
      return group;
    })
    .filter((group) => !storedGroups.some((storedGroup) => storedGroup.name == group.name));

  const allGroups = [...storedGroups, ...examplesWithValidIDs];
  await setStorage(StorageKey.LOCAL_GROUPS, allGroups);
  await LocalStorage.setItem(StorageKey.EXAMPLE_GROUPS_INSTALLED, true);

  await showToast({ title: "Examples Installed!", style: Toast.Style.Success });
};
