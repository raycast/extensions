import { calendlyRequest } from "./client";
import { CalendlyResourceResponse, CalendlyUser } from "./types";

export async function getCurrentUser() {
  const { resource } = await calendlyRequest<CalendlyResourceResponse<CalendlyUser>>("/users/me");
  return resource;
}
