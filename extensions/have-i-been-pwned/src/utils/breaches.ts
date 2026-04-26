import { hibpFetch } from "./api";
import { Breach } from "./types";

export async function getBreachedAccount(email: string): Promise<Breach[] | null> {
  return hibpFetch<Breach[]>(
    `/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false&includeUnverified=true`,
    true,
  );
}
