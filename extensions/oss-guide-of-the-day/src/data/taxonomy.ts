import taxonomyData from "./taxonomy.json";

export type GuideLocation = {
  guide: string;
  section: string;
  topic?: string;
};

export const taxonomy = taxonomyData as Record<string, GuideLocation>;
