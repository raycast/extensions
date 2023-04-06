import fetch from "node-fetch";
import { Trainrides } from "./types";

export async function getTrainRides(from: string, to: string): Promise<Trainrides> {
  const response = await fetch(
    `https://api.irail.be/connections/?to=${to}&from=${from}&arrdep=departure&format=json&results=10`
  );
  const json = await response.json();
  return json as Trainrides;
}
