import fetch from "node-fetch";
import { Radio, RADIOS } from "../constants";
import { exec } from "child_process";

export interface TrackMetadata {
  firstLine: string;
  secondLine: string;
  cover: string;
  startTime: number;
  endTime: number;
}

export interface RootObject {
  prev: TrackMetadata[];
  now: TrackMetadata;
  next: TrackMetadata[];
  delayToRefresh: number;
}

const DEFAULT_URL = "https://api.radiofrance.fr/livemeta/live/{radio_id}/webrf_fip_player?preset=200x200";

export const formatUrl = (radioId: string): string => {
  return DEFAULT_URL.replace("{radio_id}", radioId);
};

export const fetchMetadata = async (radioId: string): Promise<RootObject | null> => {
  try {
    const data = await fetch(formatUrl(radioId));
    return (await data.json()) as Promise<RootObject>;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const getRadioByName = (radioTitle: string): Radio | undefined => {
  return RADIOS.find((radio) => radio.title === radioTitle);
};
export const getRadioById = (radioId: string): Radio | undefined => {
  return RADIOS.find((radio) => radio.id === radioId);
};

export const runAppleScript = (script: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else if (stderr) {
        reject(stderr);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};
