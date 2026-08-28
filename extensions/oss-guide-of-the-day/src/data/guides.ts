import guideData from "./guides.json";

export type Guide = {
  title: string;
  fact: string;
  action: string;
  source: string;
};

export const guides: readonly Guide[] = guideData;
