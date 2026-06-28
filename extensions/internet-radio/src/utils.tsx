import {
  Action,
  ActionPanel,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { runAppleScript } from "run-applescript";
import * as defaultStations from "../assets/default-stations.json";
import { colorMap } from "./genres";
import { StationData, StationListObject } from "./types";

interface ExtensionPreferences {
  audioApplication: string;
}

export const dummyStation: StationData = {
  name: "",
  shortname: "",
  website: "",
  alternateSites: [],
  outdatedSites: [],
  stream: "",
  alternateStreams: [],
  outdatedStreams: [],
  genres: [],
  slogan: "",
  description: "",
  discontinued: false,
  location: "",
  contacts: [],
  callsigns: [],
  socialProfiles: [],
  logo: "",
  otherImages: [],
  policies: [],
};

interface stationList {
  [value: string]: { [value: string]: string | string[] };
}

export async function loadDefaults() {
  // Loads default stations into LocalStorage & ensures data keys are non-null
  const testEntry = await LocalStorage.getItem("-default-data-loaded");
  if (!testEntry) {
    for (const station in defaultStations) {
      if (station == "default") {
        continue;
      }
      for (const key in (defaultStations as stationList)[station]) {
        let value = (defaultStations as stationList)[station][key];
        if (Array.isArray(value)) {
          value = value.join(",") + ",";
        }
        await LocalStorage.setItem(`station~${station}#${key}`, value);
      }
    }
    await LocalStorage.setItem("-default-data-loaded", "true");
    await LocalStorage.setItem("-is-playing", "");
    await LocalStorage.setItem("-current-station-name", "");
    await LocalStorage.setItem("-current-station-url", "");
    await LocalStorage.setItem("-current-track-id", "");
    await LocalStorage.setItem("-last-station-name", "");
    await LocalStorage.setItem("-last-station-url", "");
  }
}

export async function getAllStations() {
  // Gets a list of all stations and their associated data
  const stations: StationListObject = {};
  const stationEntries = await LocalStorage.allItems();
  Object.entries(stationEntries).forEach(([key, value]) => {
    if (key.startsWith("station~")) {
      const stationName = key.substring(key.indexOf("~") + 1, key.indexOf("#"));
      const attribute = key.substring(key.indexOf("#") + 1);
      let trueValue = value.toString();
      trueValue = trueValue.indexOf(",") == -1 ? trueValue : trueValue.split(",");

      if (!(stationName in stations)) {
        stations[stationName] = {
          name: stationName,
          shortname: "",
          website: "",
          alternateSites: [],
          outdatedSites: [],
          stream: "",
          alternateStreams: [],
          outdatedStreams: [],
          genres: [],
          slogan: "",
          description: "",
          discontinued: false,
          location: "",
          contacts: [],
          callsigns: [],
          socialProfiles: [],
          logo: "",
          otherImages: [],
          policies: [],
        };
      }
      stations[stationName][attribute] = trueValue;
    }
  });
  return stations;
}

export async function playStation(stationName: string, stationURL: string): Promise<string | number> {
  // Plays a station's stream URL in Music.app
  const isPlaying = await LocalStorage.getItem("-is-playing");
  const prevTrackID = await LocalStorage.getItem("-current-track-id");
  const prevStationName = await LocalStorage.getItem("-current-station-name");

  const preferences = getPreferenceValues<ExtensionPreferences>();
  const audioApplication = preferences.audioApplication;

  if (isPlaying == "true") {
    // Pause & remove the current stream before playing a new one
    await pausePlayback();
    await deleteTrack(prevTrackID?.toString(), prevStationName?.toString());
  }

  let streamID = "";
  if (audioApplication == "music") {
    streamID = await runAppleScript(`try
        tell application "Music"
          launch
          tell application "System Events"
            repeat while "Music" is not in (name of every process whose background only is false)
              delay 0.5
            end repeat
          end tell

          try
            set trackIDs to get id of URL tracks
            open location "${stationURL}"
            repeat with newID in (get id of URL tracks)
                if newID is not in trackIDs then
                    set theStream to track id newID
                    set name of theStream to "Raycast: ${stationName}"
                    return contents of newID
                end if
            end repeat
          on error
            open location "${stationURL}"
            delay 0.5
            try
              set name of URL track 1 to "Raycast: ${stationName}"
              return id of URL track 1
            on error
              return ""
            end try
          end try
        end tell
      on error
        return "err:noapp"
      end try`);
  } else if (audioApplication == "quicktime") {
    streamID = await runAppleScript(`try
        tell application "QuickTime Player"
          open location "${stationURL}"
          repeat while visible of window 1 = false
            delay 0.5
          end repeat
          delay 1
          set visible of window 1 to false
          return name of document 1
        end tell
      on error
        return "err:noapp"
      end try`);
  } else if (audioApplication == "vlc") {
    streamID = await runAppleScript(`try
        tell application "VLC"
          open location "${stationURL}"
          return path of current item
        end tell
      on error
        return "err:noapp"
      end try`);
  } else if (audioApplication == "vox") {
    streamID = await runAppleScript(`try
        tell application "Vox"
          playUrl "${stationURL}"
          return track 
        end tell
      on error
        return "err:noapp"
      end try`);
  }

  if (streamID === "err:noapp") {
    // Couldn't find target application
    if (environment.launchType == LaunchType.Background || environment.commandName === "menubar-radio") {
      await showHUD("Error: Audio Application Not Found!");
    } else {
      await showToast({ title: "Error: Audio Application Not Found!", style: Toast.Style.Failure });
    }
    return -1;
  }

  await LocalStorage.setItem("-is-playing", "true");
  await LocalStorage.setItem("-current-station-name", stationName);
  await LocalStorage.setItem("-current-station-url", stationURL);
  await LocalStorage.setItem("-current-track-id", streamID);
  await launchCommand({ name: "current-station", type: LaunchType.Background });

  if (environment.commandName != "menubar-radio") {
    try {
      await launchCommand({ name: "menubar-radio", type: LaunchType.Background });
    } catch (error) {
      console.log("Menubar Radio command is disabled.");
    }
  }

  return streamID;
}

export async function pausePlayback() {
  // Pauses Music.app and clears storage data keys
  const stationName = await LocalStorage.getItem("-current-station-name");
  const stationURL = await LocalStorage.getItem("-current-station-url");
  const trackID = await LocalStorage.getItem("-current-track-id");

  await LocalStorage.setItem("-last-station-name", stationName as string);
  await LocalStorage.setItem("-last-station-url", stationURL as string);

  const preferences = getPreferenceValues<ExtensionPreferences>();
  const audioApplication = preferences.audioApplication;

  if (audioApplication == "music") {
    await runAppleScript(`tell application "Music"
        pause
      end tell`);
  } else if (audioApplication == "quicktime") {
    await runAppleScript(`tell application "QuickTime Player"
        try
          close first document whose name is "${trackID}"
        end try
      end tell`);
  } else if (audioApplication == "vlc") {
    await runAppleScript(`tell application "VLC"
        stop
      end tell`);
  } else if (audioApplication == "vox") {
    await runAppleScript(`tell application "Vox"
        pause
      end tell`);
  }

  await LocalStorage.setItem("-is-playing", "");
  await LocalStorage.setItem("-current-station-name", "");
  await LocalStorage.setItem("-current-track-id", "");

  await launchCommand({ name: "current-station", type: LaunchType.Background });

  if (environment.commandName != "menubar-radio") {
    try {
      await launchCommand({ name: "menubar-radio", type: LaunchType.Background });
    } catch (error) {
      console.log("Menubar Radio command is disabled.");
    }
  }
}

export async function deleteTrack(trackID?: string, trackName?: string) {
  // Deletes a station's track from Music.app
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const audioApplication = preferences.audioApplication;
  if (audioApplication == "quicktime" || audioApplication == "vlc" || audioApplication == "vox") {
    return;
  }

  if (trackID != undefined && trackID != "") {
    await runAppleScript(`tell application "Music"
            try
                delete track id ${trackID}
            end try
        end tell`);
  } else if (trackName != undefined && trackName != "") {
    await runAppleScript(`tell application "Music"
            try
                set trackID to (get id of first item of (URL tracks whose name is "${trackName}"))
                delete track id trackID
            end try
        end tell`);
  }
}

export async function getPlayStatus() {
  return (await runAppleScript(`tell application "Music" to return player state`)) == "playing";
}

export async function deleteStation(stationName: string, stationData: StationData) {
  // Deletes a station from storage
  for (const key in stationData) {
    await LocalStorage.setItem("-temp-station-info", JSON.stringify(stationData));
    await LocalStorage.removeItem(`station~${stationName}#${key}`);
  }
}

export async function modifyStation(
  oldName: string,
  newName: string,
  oldData: StationData,
  newData: StationData,
  setStations: React.Dispatch<React.SetStateAction<StationListObject | undefined>>
) {
  // Updates the metadata of a station
  if (oldName != "") {
    await deleteStation(oldName, oldData);
  }
  for (const key in newData) {
    let value = newData[key];
    if (value == undefined) continue;
    if (Array.isArray(value)) {
      value = value.join(",") + ",";
    }
    await LocalStorage.setItem(`station~${newName}#${key}`, value.toString());
  }

  getAllStations().then((stationList) => {
    setStations(stationList);
  });
}

export function EditStationForm(props: {
  stationName: string;
  stationData: StationData;
  setStations: React.Dispatch<React.SetStateAction<StationListObject | undefined>>;
}) {
  // Displays a form for updating station metadata
  const { stationName, stationData, setStations } = props;

  const [nameError, setNameError] = useState<string | undefined>();
  const [streamError, setStreamError] = useState<string | undefined>();
  const [websiteError, setWebsiteError] = useState<string | undefined>();

  const { pop } = useNavigation();

  const checkStationNameValidity = (name: string): boolean => {
    if (name.length == 0) {
      setNameError("Station name cannot be empty!");
      return false;
    } else if (nameError !== undefined) {
      setNameError(undefined);
    }
    return true;
  };

  const checkStationStreamURLValidity = (streamURL: string): boolean => {
    if (streamURL.length == 0) {
      setStreamError("Stream URL cannot be empty!");
      return false;
    } else if (!streamURL.includes(":") || streamURL.includes(" ")) {
      setStreamError("Please enter a valid stream URL!");
      return false;
    } else if (streamError !== undefined) {
      setStreamError(undefined);
    }
    return true;
  };

  const checkStationWebsiteValidity = (websiteURL: string): boolean => {
    if (websiteURL != "" && !websiteURL.includes(":") && !websiteURL.startsWith("/")) {
      setWebsiteError("Please enter a valid website URL, or leave this blank!");
      return false;
    } else if (websiteError !== undefined) {
      setWebsiteError(undefined);
    }
    return true;
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              if (
                !checkStationNameValidity(values.nameField) ||
                !checkStationStreamURLValidity(values.streamField) ||
                !checkStationWebsiteValidity(values.websiteField)
              ) {
                return;
              }

              modifyStation(
                stationName,
                values.nameField,
                stationData,
                {
                  name: stationName,
                  shortname: stationData.shortname,
                  website: values.websiteField,
                  alternateSites: stationData.alternateSites,
                  outdatedSites: stationData.outdatedSites,
                  stream: values.streamField,
                  alternateStreams: stationData.alternateStreams,
                  outdatedStreams: stationData.outdatedStreams,
                  genres: values.genresField,
                  slogan: stationData.slogan,
                  description: stationData.description,
                  discontinued: false,
                  location: stationData.location,
                  contacts: stationData.contacts,
                  callsigns: stationData.callsigns,
                  socialProfiles: stationData.socialProfiles,
                  logo: stationData.logo,
                  otherImages: stationData.otherImages,
                  policies: stationData.policies,
                },
                setStations
              );
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        autoFocus={true}
        title="Station Name"
        placeholder="Full name of the station"
        defaultValue={stationName}
        error={nameError}
        onBlur={(event) => checkStationNameValidity(event.target.value || "")}
      />

      <Form.TextField
        id="websiteField"
        title="Website URL"
        placeholder="URL of the main site for this radio station"
        error={websiteError}
        onChange={() => (websiteError !== undefined ? setWebsiteError(undefined) : null)}
        onBlur={(event) => checkStationWebsiteValidity(event.target.value || "")}
        defaultValue={stationData.website as string}
      />

      <Form.TextField
        id="streamField"
        title="Stream URL"
        placeholder="URL of audio livestream"
        error={streamError}
        onChange={() => (streamError !== undefined ? setStreamError(undefined) : null)}
        onBlur={(event) => checkStationStreamURLValidity(event.target.value || "")}
        defaultValue={stationData.stream as string}
      />

      <Form.TagPicker
        id="genresField"
        title="Genres"
        defaultValue={(stationData.genres as string[]).slice(0, -1)}
        placeholder="List of genres streamed by this station"
      >
        {Object.entries(colorMap).map(([key, color]) => {
          return (
            <Form.TagPicker.Item value={key} title={key} key={key} icon={{ source: Icon.Circle, tintColor: color }} />
          );
        })}
      </Form.TagPicker>
    </Form>
  );
}
