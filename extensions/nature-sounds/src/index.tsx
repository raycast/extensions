import { useEffect, useState } from "react";
import { List, showToast, Toast, LocalStorage } from "@raycast/api";
import { AudioListItem } from "./AudioListItem";
import { Audios, Item } from "./types";

const audioFiles: Audios = {
  stop: {
    filename: "stop",
    name: "Stop all sounds",
    icon: "🛑",
  },
  fire: {
    filename: "fire",
    name: "Fire",
    subtitle: "Toast some marshmellows by the fire.",
    icon: "🔥",
  },
  rain: {
    filename: "rain",
    name: "Rain",
    subtitle: "Relax to the soothing rain.",
    icon: "💦",
  },
  rainforest: {
    filename: "rainforest",
    name: "Rainforest",
    subtitle: "Transport yourself to the tropical rainforest.",
    icon: "🌲",
  },
  thunderstorm: {
    filename: "thunderstorm",
    name: "Thunderstorm",
    subtitle: "The thunder rolls...",
    icon: "⚡",
  },
  waves: {
    filename: "waves",
    name: "Waves",
    subtitle: "A day at the beach.",
    icon: "🌊",
  },
  wind: {
    filename: "wind",
    name: "Wind",
    subtitle: "Watch out for this wind.",
    icon: "💨",
  },
};

interface State {
  error?: Error;
}

export default function Command() {
  const [state, setState] = useState<State>({});
  const [ready, setReady] = useState<boolean>(false);
  const [playing, setPlaying] = useState<Item[]>([]);

  const getCurrentlyPlaying = async () => {
    return await LocalStorage.getItem<string>("playing");
  };

  useEffect(() => {
    getCurrentlyPlaying().then((resp) => {
      setPlaying(JSON.parse(resp ?? ""));
      setReady(true);
    });
  }, []);

  useEffect(() => {
    console.log("Playing changed --------", playing);
    LocalStorage.setItem("playing", JSON.stringify(playing));
  }, [playing]);

  useEffect(() => {
    if (state.error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed loading stories",
        message: state.error.message,
      });
    }
  }, [state.error]);

  return (
    <List isLoading={!ready}>
      {Object.entries(audioFiles)?.map((item, index) => (
        <AudioListItem key={item[0]} item={item[1]} index={index} playing={playing} setPlaying={setPlaying} />
      ))}
    </List>
  );
}
