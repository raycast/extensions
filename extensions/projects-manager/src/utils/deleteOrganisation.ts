import { Organisation } from "../types/organisation";
import { LocalStorage } from "@raycast/api";
import { getOrganisations } from "./getAllOrganisations";

export async function deleteOrganisation(organisation: Organisation) {
  const organisations = await getOrganisations();
  const index = organisations.findIndex((o) => o.slug === organisation.slug);
  if (index !== -1) {
    organisations.splice(index, 1);
    await LocalStorage.setItem("organisations", JSON.stringify(organisations));
  }
}
