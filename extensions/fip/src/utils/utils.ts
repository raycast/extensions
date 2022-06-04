import fetch from "node-fetch";

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

export const fetchMetadata = async (): Promise<RootObject | null> => {
  try {
    const data = await fetch("https://api.radiofrance.fr/livemeta/live/7/webrf_fip_player?preset=200x200");
    return (await data.json()) as Promise<RootObject>;
  } catch (e) {
    console.error(e);
    return null;
  }
};
