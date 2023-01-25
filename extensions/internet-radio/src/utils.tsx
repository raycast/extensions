import {
  Action,
  ActionPanel,
  Color,
  environment,
  Form,
  launchCommand,
  LaunchType,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { runAppleScript } from "run-applescript";

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
  christmas: Color.Green,
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
};

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
    genres: ["80s", "oldies", "top 40", "pop", "rock"],
  },
  "Pink Noise Radio": {
    website: "",
    stream: "https://uk1.internet-radio.com/proxy/pinknoise?mp=/stream",
    genres: ["noise", "ambient", "chillout"],
  },
  "Brown Noise Radio": {
    website: "",
    stream: "https://uk1.internet-radio.com/proxy/brownnoise?mp=/stream",
    genres: ["noise", "ambient", "chillout"],
  },
  "White Noise Radio": {
    website: "",
    stream: "https://uk1.internet-radio.com/proxy/whitenoise?mp=/stream",
    genres: ["noise", "ambient", "chillout"],
  },
  "NoLife Radio": {
    website: "https://nolife-radio.com",
    stream: "http://listen.nolife-radio.com/stream",
    genres: ["video game music", ""],
  },
  "Radio Summernight": {
    website: "http://radiosummernight.ch",
    stream: "https://stream.laut.fm/radiosummernight",
    genres: ["pop", "alternative", "rock"],
  },
  "Metal Rock Radio": {
    website: "http://metalrockradio.com",
    stream: "https://kathy.torontocast.com:2800/stream/1/",
    genres: ["metal", "hard rock", "classic rock"],
  },
  "Frontier Country": {
    website: "http://www.frontiercountryonline.com",
    stream: "http://192.111.140.11:8205/stream/1/",
    genres: ["country", ""],
  },
  "Dubstep.fm": {
    website: "https://www.dubstep.fm",
    stream: "http://50.117.1.60/stream/1/",
    genres: ["dubstep", "electronic"],
  },
  "Blues Radio": {
    website: "http://www.bluesradio.gr",
    stream: "http://i4.streams.ovh:8352/stream/1/",
    genres: ["blues", ""],
  },
  "Majestic Jukebox Radio": {
    website: "https://www.majesticjukeboxradio.com/",
    stream: "https://uk3.internet-radio.com/proxy/majesticjukebox?mp=/live",
    genres: ["rock", "jazz", "blues", "country", "soul", "40s", "50s", "60s", "70s", "80s"],
  },
  "BBC Radio 1": {
    website: "https://tunein.com/radio/BBC-Radio-1-988-s24939/",
    stream: "http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one",
    genres: ["pop", ""],
  },
  "BBC World Service": {
    website: "https://tunein.com/radio/BBC-World-Service-News-s24948/",
    stream: "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
    genres: ["news", "talk"],
  },
  "Bloomberg Radio": {
    website: "https://tunein.com/radio/Bloomberg-Radio-s165740/",
    stream: "https://playerservices.streamtheworld.com/api/livestream-redirect/WBBRAMAAC.aac",
    genres: ["news", "talk"],
  },
  "Associated Press": {
    website: "https://tunein.com/radio/Associated-Press-s249264/",
    stream: "http://apnews.streamguys1.com/apnews",
    genres: ["news", "talk"],
  },
  "KPOP Radio": {
    website: "https://zeno.fm/radio/kpop-radio",
    stream: "https://stream-55.zeno.fm/382yfn6u498uv?zs=mvrPGxDnTw-zWW4K1sLI2A",
    genres: ["kpop", ""],
  },
  "WRCW Crime Story": {
    website: "https://live365.com/station/WRCW-Crime-Story----a60381",
    stream: "https://streaming.live365.com/a60381",
    genres: ["talk", ""],
  },
  NPR: {
    website: "https://www.npr.org",
    stream: "https://playerservices.streamtheworld.com/api/livestream-redirect/WMEAFM.mp3",
    genres: ["news", "talk"],
  },
  "Hot Hitz": {
    website: "http://player.100hitz.com",
    stream: "https://pureplay.cdnstream1.com/6027_128.mp3",
    genres: ["hits", "pop"],
  },
  "Fox News": {
    website: "https://radio.foxnews.com/player-files/radio.php",
    stream: "https://live.wostreaming.net/direct/foxnewsradio-foxnewsradioaac-imc",
    genres: ["news", "talk"],
  },
  "NBC News": {
    website: "https://tunein.com/radio/NBC-News-NOW-s310584/",
    stream: "https://stream.revma.ihrhls.com/zc6043",
    genres: ["news", "talk"],
  },
  Newsmax: {
    website: "https://www.iheart.com/live/newsmax-8856/",
    stream: "https://playerservices.streamtheworld.com/api/livestream-redirect/NEWSMAX_FM.aac",
    genres: ["news", "talk"],
  },
  ESPN: {
    website: "https://www.iheart.com/live/espn-radio-7903/",
    stream: "https://live.wostreaming.net/direct/espn-network-48",
    genres: ["sports", "talk"],
  },
  AmbientRadio: {
    website: "http://www.ambientradio.net",
    stream: "https://stream.rcast.net/13551.mp3",
    genres: ["ambient", "chillout"],
  },
  "Greatest Hits Radio USA": {
    website: "https://www.greatesthitsradiousa.com/",
    stream: "https://stream.rcast.net/69558.mp3",
    genres: ["hits", "oldies"],
  },
  "Adagio.FM": {
    website: "http://adagio.fm",
    stream: "http://hi5.adagio.fm/;",
    genres: ["classical", ""],
  },
  "Streaming Soundtracks": {
    website: "http://www.streamingsoundtracks.com",
    stream: "http://hi5.streamingsoundtracks.com/;",
    genres: ["soundtracks", ""],
  },
};

export async function loadDefaults() {
  // Loads default stations into LocalStorage & ensures data keys are non-null
  const testEntry = await LocalStorage.getItem("-default-data-loaded");
  if (!testEntry) {
    for (const station in defaultStations) {
      for (const key in defaultStations[station]) {
        let value = defaultStations[station][key];
        if (Array.isArray(value)) {
          value = value.join(",");
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
    let value = stationData[key];
    if (Array.isArray(value)) {
      value = value.join(",");
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
  // Updates the metadata of a station
  if (oldName != "") {
    await deleteStation(oldName, oldData);
  }
  for (const key in newData) {
    let value = newData[key];
    if (Array.isArray(value)) {
      value = value.join(",");
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
  const [genreError, setGenreError] = useState<string | undefined>();

  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              const genres: string[] = [];
              if (values.genresField.indexOf(",") != -1) {
                values.genresField.split(",").forEach((genre: string) => genres.push(genre.trim()));
              } else {
                genres.push(values.genresField);
                genres.push("");
              }

              modifyStation(
                stationName,
                values.nameField,
                stationData,
                {
                  website: values.websiteField,
                  stream: values.streamField,
                  genres: genres,
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
        }}
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
        onBlur={() => {
          if (genreError !== undefined) {
            setGenreError(undefined);
          }
        }}
        defaultValue={
          (stationData.genres as string[]).join("") === "" ? "" : (stationData.genres as string[]).join(", ")
        }
      />
    </Form>
  );
}
