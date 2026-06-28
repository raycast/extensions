import { bigquery } from "generate-schema";

export const TransformJSONtoBigQuery = {
  from: "JSON",
  to: "Big Query Schema",
  transform: (value: string) => JSON.stringify(bigquery(JSON.parse(value)), null, 2),
};
