import {
  Action,
  ActionPanel,
  Color,
  environment,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { runAppleScript } from "run-applescript";
import * as defaultStations from "../assets/default-stations.json";

export const colorMap: { [key: string]: Color } = {
  "40s": Color.Red,
  "50s": Color.Orange,
  "60s": Color.Yellow,
  "70s": Color.Green,
  "80s": Color.Blue,
  rock: Color.Red,
  pop: Color.Blue,
  disco: Color.Magenta,
  alternative: Color.Yellow,
  indie: Color.Yellow,
  "classic rock": Color.Red,
  metal: Color.SecondaryText,
  "heavy metal": Color.SecondaryText,
  punk: Color.Purple,
  ambient: Color.Magenta,
  "new age": Color.Blue,
  downtempo: Color.Purple,
  chillout: Color.Blue,
  psychill: Color.Purple,
  soundtracks: Color.Green,
  classical: Color.Green,
  symphony: Color.Green,
  romantic: Color.Red,
  piano: Color.SecondaryText,
  jpop: Color.Red,
  "top 40": Color.Red,
  oldies: Color.Orange,
  noise: Color.Magenta,
  "hard rock": Color.Red,
  country: Color.Yellow,
  dubstep: Color.Magenta,
  electronic: Color.Magenta,
  "video game music": Color.Green,
  blues: Color.Blue,
  jazz: Color.Orange,
  news: Color.Red,
  sports: Color.Blue,
  games: Color.Green,
  hits: Color.Red,
  kpop: Color.Magenta,
  talk: Color.SecondaryText,
  ASMR: Color.Blue,
  holiday: Color.Green,
  folk: Color.Orange,
  dance: Color.Purple,
  emo: Color.Purple,
  opera: Color.Yellow,
  grunge: Color.Green,
  goth: Color.Purple,
  anime: Color.Magenta,
  acoustic: Color.Orange,
  gospel: Color.Yellow,
  guitar: Color.Orange,
  lullabies: Color.Magenta,
  "sing along": Color.Magenta,
  stories: Color.Magenta,
  "avant-garde": Color.Red,
  baroque: Color.SecondaryText,
  choral: Color.Magenta,
  concerto: Color.Red,
  expressionist: Color.Red,
  impressionist: Color.Magenta,
  orchestral: Color.Orange,
  novelty: Color.Green,
  parody: Color.SecondaryText,
  comedy: Color.Orange,
  jingles: Color.Blue,
  bluegrass: Color.Blue,
  fiddle: Color.Orange,
  christian: Color.Magenta,
  cowboy: Color.Orange,
  club: Color.Purple,
  exercise: Color.Yellow,
  hardcore: Color.Red,
  house: Color.Orange,
  techno: Color.Magenta,
  trance: Color.Purple,
  trap: Color.Orange,
  swing: Color.Blue,
  drum: Color.SecondaryText,
  crunk: Color.Green,
  glitch: Color.PrimaryText,
  "hip hop": Color.Purple,
  rap: Color.Red,
  karaoke: Color.Red,
  latin: Color.Orange,
  soul: Color.SecondaryText,
  "R&B": Color.Red,
  reggae: Color.Yellow,
  african: Color.Yellow,
  asian: Color.Magenta,
  australian: Color.Red,
  cajun: Color.Orange,
  caribbean: Color.Blue,
  celtic: Color.Green,
  european: Color.Magenta,
  polka: Color.Purple,
  hawaiian: Color.Yellow,
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
  const stations: { [stationName: string]: { [key: string]: string | string[] } } = {};
  const stationEntries = await LocalStorage.allItems();
  Object.entries(stationEntries).forEach(([key, value]) => {
    if (key.startsWith("station~")) {
      const stationName = key.substring(key.indexOf("~") + 1, key.indexOf("#"));
      const attribute = key.substring(key.indexOf("#") + 1);
      const trueValue = value.indexOf(",") == -1 ? value : value.split(",");

      if (!(stationName in stations)) {
        stations[stationName] = {
          name: stationName,
        };
      }
      stations[stationName][attribute] = trueValue;
    }
  });
  return stations;
}

export async function playStation(stationName: string, stationURL: string) {
  // Plays a station's stream URL in Music.app
  const isPlaying = await LocalStorage.getItem("-is-playing");
  const prevTrackID = await LocalStorage.getItem("-current-track-id");
  const prevStationName = await LocalStorage.getItem("-current-station-name");

  if (isPlaying == "true") {
    await pausePlayback();
    await deleteTrack(prevTrackID?.toString(), prevStationName?.toString());
  }

  const streamID = await runAppleScript(`tell application "Music"
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
    end tell`);

  await LocalStorage.setItem("-is-playing", "true");
  await LocalStorage.setItem("-current-station-name", stationName);
  await LocalStorage.setItem("-current-station-url", stationURL);
  await LocalStorage.setItem("-current-track-id", streamID);
  await launchCommand({ name: "current-station", type: LaunchType.Background });

  if (environment.commandName != "menubar-radio") {
    await launchCommand({ name: "menubar-radio", type: LaunchType.Background });
  }

  return streamID;
}

export async function pausePlayback() {
  // Pauses Music.app and clears storage data keys

  const stationName = await LocalStorage.getItem("-current-station-name");
  const stationURL = await LocalStorage.getItem("-current-station-url");

  await LocalStorage.setItem("-last-station-name", stationName as string);
  await LocalStorage.setItem("-last-station-url", stationURL as string);

  await runAppleScript(`tell application "Music"
      pause
    end tell`);

  await LocalStorage.setItem("-is-playing", "");
  await LocalStorage.setItem("-current-station-name", "");
  await LocalStorage.setItem("-current-track-id", "");

  await launchCommand({ name: "current-station", type: LaunchType.Background });

  if (environment.commandName != "menubar-radio") {
    await launchCommand({ name: "menubar-radio", type: LaunchType.Background });
  }
}

export async function deleteTrack(trackID?: string, trackName?: string) {
  // Deletes a station's track from Music.app
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

export async function deleteStation(stationName: string, stationData: { [key: string]: string | string[] }) {
  // Deletes a station from storage
  for (const key in stationData) {
    await LocalStorage.removeItem(`station~${stationName}#${key}`);
  }
}

async function modifyStation(
  oldName: string,
  newName: string,
  oldData: { [key: string]: string | string[] },
  newData: { [key: string]: string | string[] },
  setStations: React.Dispatch<
    React.SetStateAction<
      | {
          [stationName: string]: {
            [key: string]: string | string[];
          };
        }
      | undefined
    >
  >
) {
  // Updates the metadata of a station
  if (oldName != "") {
    await deleteStation(oldName, oldData);
  }
  for (const key in newData) {
    let value = newData[key];
    if (Array.isArray(value)) {
      value = value.join(",") + ",";
    }
    await LocalStorage.setItem(`station~${newName}#${key}`, value);
  }

  getAllStations().then((stationList) => {
    setStations(stationList);
  });
}

export function EditStationForm(props: {
  stationName: string;
  stationData: { [key: string]: string | string[] };
  setStations: React.Dispatch<
    React.SetStateAction<
      | {
          [stationName: string]: {
            [key: string]: string | string[];
          };
        }
      | undefined
    >
  >;
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
                  website: values.websiteField,
                  stream: values.streamField,
                  genres: values.genresField,
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
        placeholder="Memorable name for the station"
        defaultValue={stationName}
        error={nameError}
        onBlur={(event) => checkStationNameValidity(event.target.value || "")}
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

      <Form.TextField
        id="websiteField"
        title="Website URL"
        placeholder="URL of the main site for this radio station"
        error={websiteError}
        onChange={() => (websiteError !== undefined ? setWebsiteError(undefined) : null)}
        onBlur={(event) => checkStationWebsiteValidity(event.target.value || "")}
        defaultValue={stationData.website as string}
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
