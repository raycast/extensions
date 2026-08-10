export type PredictionResponse = {
  next: string | null;
  previous: string | null;
  results: Prediction[];
  detail?: string;
};
export type Prediction = {
  id: string;
  urls: {
    get: string;
  };
  input: { prompt?: string } & Record<string, any>;
  status: "starting" | "processing" | "succeeded" | "failed" | "cancelled";
  output: string[] | string;
  metrics: {
    predict_time: number;
  };
};
export type dbEntry = {
  id: string;
  src: string;
  url: string;
  prompt?: string;
};
