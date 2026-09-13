import type { Relation } from "../api/types";
import { contactUrl, thirdpartyUrl } from "../api/urls";
import { search } from "../index/fuzzy";
import { CONTACT_FIELDS, THIRDPARTY_FIELDS } from "../index/loadIndex";
import { getToolContext } from "./toolContext";

type Input = {
  /** Search term: company name, person name, email address or phone number. */
  query: string;
};

type CompanyHit = {
  type: "company";
  id: number;
  name: string;
  relation: Relation;
  email: string | null;
  url: string;
};

type ContactHit = {
  type: "contact";
  id: number;
  name: string;
  position: string | null;
  email: string | null;
  company: string | null;
  url: string;
};

export default async function tool(input: Input): Promise<{ companies: CompanyHit[]; contacts: ContactHit[] }> {
  const { index, web } = await getToolContext();
  const companyById = new Map(index.thirdparties.map((t) => [t.id, t]));

  return {
    companies: search(index.thirdparties, THIRDPARTY_FIELDS, input.query, 10).map((company) => ({
      type: "company",
      id: company.id,
      name: company.name,
      relation: company.relation,
      email: company.email,
      url: thirdpartyUrl(web, company.id),
    })),
    contacts: search(index.contacts, CONTACT_FIELDS, input.query, 10).map((contact) => ({
      type: "contact",
      id: contact.id,
      name: [contact.firstname, contact.lastname].filter(Boolean).join(" "),
      position: contact.position,
      email: contact.email,
      company: contact.thirdpartyId ? (companyById.get(contact.thirdpartyId)?.name ?? null) : null,
      url: contactUrl(web, contact.id),
    })),
  };
}
