import { MiteClient } from "./client";
import type { MiteService } from "./types";

export async function getServices(): Promise<MiteService[]> {
  const client = new MiteClient();
  const response =
    await client.get<Array<{ service: MiteService }>>("/services.json");

  return response
    .map((item) => item.service)
    .filter((service) => !service.archived)
    .sort((a, b) => a.name.localeCompare(b.name));
}
