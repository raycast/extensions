import { Trainrides } from "@/types";

export async function getTrainRides(from: string, to: string): Promise<Trainrides> {
  try {
    const response = await fetch(
      `https://api.irail.be/connections/?to=${to}&from=${from}&arrdep=departure&format=json&results=10`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return json as Trainrides;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch train rides: ${error.message}`);
    }
    throw new Error("Failed to fetch train rides: Unknown error");
  }
}
