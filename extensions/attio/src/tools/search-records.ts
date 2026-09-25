import { searchRecords } from "../api/endpoints";

type Input = {
  /** The text to search for — a person's name, a company name, a deal title, an email address, or a domain. */
  query: string;
  /**
   * Which record types to search. Omit to search all three.
   * Valid values: "people", "companies", "deals".
   */
  objects?: ("people" | "companies" | "deals")[];
};

/** Search people, companies, and deals in the Attio workspace. */
export default async function tool(input: Input) {
  const { data } = await searchRecords(
    input.query,
    input.objects?.length ? input.objects : ["people", "companies", "deals"],
  );
  return data.map((h) => ({
    record_id: h.id.record_id,
    object: h.object_slug,
    title: h.record_text,
  }));
}
