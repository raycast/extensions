import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { MoneybirdApiCustomer, MoneybirdApiProject, MoneybirdTimeEntry, MoneybirdUser } from "../types/moneybird";
import { MoneybirdAdministration } from "../types/moneybird";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Moneybird",
  providerIcon: "extension-icon.png",
  description: "Connect your Moneybird administration to Raycast and start registering time entries",
});

export const provider = new OAuthService({
  client,
  clientId: "ac9ad5e801c145dfa02732c8c62b1d8f",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/2QijvWZlCgJtKVzE9EG_mGx2DulRYvJQZlKC0cN8CwjSTccDV-mwsxiRx03lbj63Hl53CKRb5vi37PJ8AJMvarHholI5CvrGbIX7AeIIyoqcX-bAF2bnwnKGWzK-7EWxqJxog9aX4KD1lS_CyVONoOBVhhCIsTUpzeuusGMuDfD-H90",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/HkdQIb7W7JlFwNFCj2yL6zDPvJHb-vnTCrL_iPlT_K77Z-hQHyRJ-iiLSrkfjNta8Yys7_qRGKHBiAIVVt5GnqiV-VvvegeT9INJ24TrXTHk_P2MT0GOTd8fD9ogDuOgdPyMahi1mePSjhGKHTsBuPloYZFqNnDSzr4_ioxJBQ",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/66Tt7sCc6O70T4V3Rf_Dr4B941f08fkyizdDhimTODW0M7niNRllwvyk7FLX3XLaj0WNAWZBeOG1fZ8E1aTYWQR8ThljnyaUy3zS68Ocd5oxI6p4SUY7q2oIs_IauacmW75epq8Mn-mrdcpnmpuL19R7iPHgFy3FBS1ZeHRbSg",
  scope: "time_entries sales_invoices settings",
});

const fetchData = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const accessToken = await provider.authorize();

  const response = await fetch(`https://moneybird.com/api/v2/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  });

  return response.json();
};

export const getAdministrationId = async () => {
  const administrations = await fetchData<MoneybirdAdministration[]>("administrations");

  if (administrations.length === 0) {
    throw new Error("No administration found");
  }

  return administrations[0]?.id;
};

export const getContacts = async (administrationId: string) => {
  const customers = await fetchData<MoneybirdApiCustomer[]>(`${administrationId}/contacts`);

  return customers;
};

export const getProjects = async (administrationId: string) => {
  const projects = await fetchData<MoneybirdApiProject[]>(`${administrationId}/projects`);
  return projects;
};

export const getUsers = async (administrationId: string) => {
  const users = await fetchData<MoneybirdUser[]>(`${administrationId}/users`);
  return users;
};

export const createTimeEntry = async (administrationId: string, timeEntry: MoneybirdTimeEntry) => {
  const response = await fetchData(`${administrationId}/time_entries`, {
    method: "POST",
    body: JSON.stringify({ time_entry: timeEntry }),
  });

  return response;
};
