import { getForecast } from "../api/get-forecast";

type Input = {
  /* The slug of the area to get the forecast for. */
  areaSlug: string;
};

export default async function ({ areaSlug }: Input) {
  const forecast = await getForecast(areaSlug);

  return forecast;
}
