import { SoundData } from "./types";
import { Icon } from "@raycast/api";

const soundData: SoundData[] = [
  {
    title: "Alarm Clock",
    icon: Icon.Alarm,
    value: "alarmClock.wav",
  },
  {
    title: "Dismembered Woodpecker",
    icon: Icon.Bird,
    value: "dismemberedWoodpecker.wav",
  },
  {
    title: "Flute Riff",
    icon: Icon.Music,
    value: "fluteRiff.wav",
  },
  {
    title: "Level Up",
    icon: Icon.Trophy,
    value: "levelUp.wav",
  },
  {
    title: "Piano Chime",
    icon: Icon.Music,
    value: "pianoChime.wav",
  },
  {
    title: "Terminator",
    icon: Icon.BarCode,
    value: "terminator.wav",
  },
  {
    title: "Speak Timer Name",
    icon: Icon.Person,
    value: "speak_timer_name",
  },
];
export { soundData };
