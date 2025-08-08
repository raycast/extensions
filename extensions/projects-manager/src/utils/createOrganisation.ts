import { Organisation } from "../types/organisation";
import { LocalStorage } from "@raycast/api";
import { getOrganisations } from "./getAllOrganisations";

export async function createOrganisation(organisation: Organisation) {
  const organisations = await getOrganisations();
  organisations.push(organisation);
  await LocalStorage.setItem("organisations", JSON.stringify(organisations));
}
