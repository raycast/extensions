import { Action, ActionPanel, Color, Form, LocalStorage, useNavigation } from "@raycast/api";
import { useState } from "react";
import { runAppleScript } from "run-applescript";

export const colorMap = {
    "80s": Color.Orange,
    "rock": Color.Red,
    "pop": Color.Blue,
    "disco": Color.Magenta,
    "alternative": Color.Yellow,
    "indie": Color.Yellow,
    "classic rock": Color.Red,
    "metal": Color.SecondaryText,
    "heavy metal": Color.SecondaryText,
    "punk": Color.Purple,
    "ambient": Color.Brown,
    "new age": Color.Blue,
    "downtempo": Color.Purple,
    "chillout": Color.Blue,
    "psychill": Color.Purple,
    "soundtracks": Color.Green,
    "classical": Color.Green,
    "symphony": Color.Green,
    "romantic": Color.Red,
    "piano": Color.SecondaryText,
    "christmas": Color.Green,
    "jpop": Color.Red,
    "top 40": Color.Red,
    "oldies": Color.Orange,
    "noise": Color.Brown,
    "hard rock": Color.Red,
    "country": Color.Yellow,
    "dubstep": Color.Magenta,
    "electronic": Color.Magenta,
    "video game music": Color.Green,
}

const defaultStations: { [value: string]: { [value: string]: string | string[] } } = {
  "Top 80 Radio": {
    website: "https://www.top80radio.com",
    stream: "https://securestreams6.autopo.st:2321/stream.mp3",
    genres: ["80s", "rock", "pop", "disco"],
  },
  "The Zone - Dublin": {
    website: "https://www.thezonedublin.org",
    stream: "https://uk1.internet-radio.com/stream/thezone/stream.pls",
    genres: ["alternative", "indie", "pop", "classic rock"],
  },
  "Radio Bloodstream": {
    website: "http://www.radiobloodstream.com/",
    stream:
      "https://www.internet-radio.com/servers/tools/playlistgenerator/?u=http://s8.myradiostream.com:58238/listen.pls?sid=1&t=.pls",
    genres: ["rock", "metal", "heavy metal", "punk"],
  },
  "Sleep Radio Stream": {
    website: "https://www.sleepradio.co.nz",
    stream: "http://149.56.234.138:8169/stream/1/",
    genres: ["ambient", "new age"],
  },
  "Psyndora Chillout": {
    website: "https://www.psyndora.com/chill.html",
    stream: "https://cast.magicstreams.gr:9125/stream/1/",
    genres: ["downtempo", "chillout", "psychill"],
  },
  CINEMIX: {
    website: "http://www.cinemix.radio",
    stream: "http://51.81.46.118:1190/stream/1/",
    genres: ["soundtracks", ""],
  },
  "Beethoven Channel": {
    website: "https://beethovenchannel.com/",
    stream: "https://classicalconnected.com:8012/stream",
    genres: ["classical", "symphony", "romantic", "piano"],
  },
  "Classical Radio Stream": {
    website: "https://classicalradiostream.com/",
    stream: "http://classicalconnected.com:8020/stream",
    genres: ["classical", "symphony", "romantic", "piano"],
  },
  "Radio X-MAS": {
    website: "http://www.radio-xmas.at",
    stream: "http://77.75.16.229:443/stream/1/",
    genres: ["christmas", ""],
  },
  "J-Pop Sakura": {
    website: "https://asiadreamradio.com",
    stream: "https://igor.torontocast.com:1710/stream/1/",
    genres: ["jpop", ""],
  },
  "Joy Hits": {
    website: " https://joyhits.online",
    stream: "http://stream.joyhits.online:8880/joyhits.aac",
    genres: ["top 40", "pop"],
  },
  "Magic 80s Florida": {
      website: "http://www.magicoldiesflorida.com",
      stream: "http://airspectrum.cdnstream1.com:8018/1606_192",
      genres: ["80s", "oldies", "top 40", "pop", "rock"]
  },
  "Pink Noise Radio": {
      website: "",
      stream: "https://uk1.internet-radio.com/proxy/pinknoise?mp=/stream",
      genres: ["noise", "ambient", "chillout"]
  },
  "Brown Noise Radio": {
    website: "",
    stream: "https://uk1.internet-radio.com/proxy/brownnoise?mp=/stream",
    genres: ["noise", "ambient", "chillout"]
  },
  "White Noise Radio": {
    website: "",
    stream: "https://uk1.internet-radio.com/proxy/whitenoise?mp=/stream",
    genres: ["noise", "ambient", "chillout"]
  },
  "NoLife Radio": {
      website: "https://nolife-radio.com",
      stream: "http://listen.nolife-radio.com/stream",
      genres: ["video game music", ""]
  },
  "Radio Summernight": {
      website: "http://radiosummernight.ch",
      stream: "https://stream.laut.fm/radiosummernight",
      genres: ["pop", "alternative", "rock"]
  },
  "Metal Rock Radio": {
      website: "http://metalrockradio.com",
      stream: "https://kathy.torontocast.com:2800/stream/1/",
      genres: ["metal", "hard rock", "classic rock"]
  },
  "Frontier Country": {
      website: "http://www.frontiercountryonline.com",
      stream: "http://192.111.140.11:8205/stream/1/",
      genres: ["country", ""]
  },
  "Dubstep.fm": {
      website: "https://www.dubstep.fm",
      stream: "http://50.117.1.60/stream/1/",
      genres: ["dubstep", "electronic"]
  },
};

export async function loadDefaults() {
  const testEntry = await LocalStorage.getItem("-default-data-loaded");
  if (!testEntry) {
    for (const station in defaultStations) {
      for (const key in defaultStations[station]) {
        let value = defaultStations[station][key];
        if (Array.isArray(value)) {
          value = value.join("\n");
        }
        await LocalStorage.setItem(`station~${station}#${key}`, value);
      }
    }
    await LocalStorage.setItem("-default-data-loaded", "true");

    await LocalStorage.setItem("-is-playing", "");
    await LocalStorage.setItem("-current-station-name", "");
    await LocalStorage.setItem("-current-track-id", "");
  }
}

export async function getAllStations() {
  const stations: { [stationName: string]: { [key: string]: string | string[] } } = {};
  const stationEntries = await LocalStorage.allItems();
  Object.entries(stationEntries).forEach(([key, value]) => {
    if (key.startsWith("station~")) {
      const stationName = key.substring(key.indexOf("~") + 1, key.indexOf("#"));
      const attribute = key.substring(key.indexOf("#") + 1);
      const trueValue = value.indexOf("\n") == -1 ? value : value.split("\n");

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
          -- return ""
          say "wow"
        end try
      end try
    end tell`);
  console.log("wow", streamID);
  return streamID;
}

export async function pausePlayback() {
  await runAppleScript(`tell application "Music"
      pause
    end tell`);
}

export async function deleteTrack(trackID?: string, trackName?: string) {
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
  for (const key in stationData) {
    let value = stationData[key];
    if (Array.isArray(value)) {
      value = value.join("\n");
    }
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
    if (oldName != "") {
    await deleteStation(oldName, oldData);
    }
  for (const key in newData) {
    let value = newData[key];
    if (Array.isArray(value)) {
      value = value.join("\n");
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
  const { stationName, stationData, setStations } = props;

  const [nameError, setNameError] = useState<string | undefined>();
  const [streamError, setStreamError] = useState<string | undefined>();
  const [websiteError, setWebsiteError] = useState<string | undefined>();
  const [genreError, setGenreError] = useState<string | undefined>();

  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              console.log(values);
              modifyStation(
                stationName,
                values.nameField,
                stationData,
                {
                  website: values.websiteField,
                  stream: values.streamField,
                  genres: values.genresField.split(", "),
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
        title="Station Name"
        placeholder="Memorable name for the station"
        defaultValue={stationName}
        error={nameError}
        onBlur={(event) => {
            if (event.target.value?.length == 0) {
              setNameError("Station name cannot be empty!");
            } else if (nameError !== undefined) {
                setNameError(undefined);
            }
          }
        }
      />

      <Form.TextField
        id="streamField"
        title="Stream URL"
        placeholder="URL of audio livestream"
        error={streamError}
        onChange={() => (streamError !== undefined ? setStreamError(undefined) : null)}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setStreamError("Stream URL cannot be empty!");
          } else if (!event.target.value?.includes(":") || event.target.value?.includes(" ")) {
            setStreamError("Please enter a valid stream URL!");
          } else if (streamError !== undefined) {
            setStreamError(undefined);
          }
        }}
        defaultValue={stationData.stream as string}
      />

      <Form.TextField
        id="websiteField"
        title="Website URL"
        placeholder="URL of the main site for this radio station"
        error={websiteError}
        onChange={() => (websiteError !== undefined ? setWebsiteError(undefined) : null)}
        onBlur={(event) => {
          if (event.target.value != "" && !event.target.value?.includes(":") && !event.target.value?.startsWith("/")) {
            setWebsiteError("Please enter a valid website URL, or leave this blank!");
          } else if (websiteError !== undefined) {
            setWebsiteError(undefined);
          }
        }}
        defaultValue={stationData.website as string}
      />

      <Form.TextField
        id="genresField"
        title="Genres"
        placeholder="Comma-separated list of genres streamed by this station"
        error={genreError}
        onChange={() => (genreError !== undefined ? setGenreError(undefined) : null)}
        onBlur={(event) => {
          if (genreError !== undefined) {
            setGenreError(undefined);
          }
        }}
        defaultValue={(stationData.genres as string[]).join(", ")}
      />
    </Form>
  );
}
