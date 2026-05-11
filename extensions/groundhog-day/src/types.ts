type Prediction = {
  year: number;
  shadow: 0 | 1 | null;
  details: string;
};
export type Groundhog = {
  id: number;
  slug: string;
  shortname: string;
  name: string;
  city: string;
  region: string;
  country: "USA" | "Canada";
  coordinates: string;
  source: string;
  contact: string;
  currentPrediction: string;
  isGroundhog: 0 | 1;
  type: string;
  active: 0 | 1;
  successor: string;
  description: string;
  image: string;
  predictionsCount: number;
  predictions: Prediction[];
};
export type GroundhogsResponse = {
  groundhogs: Groundhog[];
};
