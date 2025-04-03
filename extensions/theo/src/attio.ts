import { getPreferenceValues } from "@raycast/api";

const ATTIO_API_BASE = "https://api.attio.com/v2";

const CONTEXT_IDS = {
  startup: "58569f90-67ae-49bd-a5cf-51a876ee02f8",
} as const;

const THESIS_IDS = {
  modern: "f247bdad-0a66-42ae-9436-9c650dc27a99",
  genai: "2835f78f-983a-469f-b799-148022ed8040",
  web3: "5a866a22-a727-434e-a776-ad9de786ffc1",
  other: "611db4d9-a07f-4a5d-bd15-f8fb1677e01d",
} as const;

const SOURCE_IDS = {
  inbound: "bee5ea19-5d1a-41b0-b130-31747ec04418",
  referral: "af3aae6a-0763-455d-9583-9062817bee58",
  research_automated: "88b2e635-759f-419f-ac8f-119ce53155f4",
  research_manual: "6e125540-2d42-48e1-8b3d-4ddf54a04881",
  legacy: "1371290d-328f-45f5-af79-f3b1cf43e995",
  none: "afb913a2-2f3d-4ab5-a9f6-6fb29be3c8f9",
} as const;

export type Thesis = keyof typeof THESIS_IDS;
export type Source = keyof typeof SOURCE_IDS;

interface AttioCompanyInput {
  name: string;
  domains: string[];
  owner: string[];
  thesis: Thesis;
  source: Source;
}

export async function createCompany(input: AttioCompanyInput): Promise<void> {
  const response = await fetch(`${ATTIO_API_BASE}/objects/companies/records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPreferenceValues().ATTIO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "company",
        values: {
          domains: input.domains,
          owner: input.owner,
          context: CONTEXT_IDS.startup,
          thesis: THESIS_IDS[input.thesis],
          source: SOURCE_IDS[input.source],
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.log(error);
    throw new Error(`Failed to create company: ${JSON.stringify(error)}`);
  }
}
