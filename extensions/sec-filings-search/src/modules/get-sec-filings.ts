import axios from "axios";

const secUrl =
  "https://www.sec.gov/Archives/edgar/data/[CIK]/[accessionNumber]/[primaryDocument]";

export async function getSecFilings({
  cik,
}: {
  cik: string;
}): Promise<GetSecFilingsResponse> {
  const _cik = cik.padStart(10, "0");

  const { data } = await axios.get<SubmissionsResponse>(
    `https://data.sec.gov/submissions/CIK${_cik}.json`,
    {
      headers: {
        "User-Agent": "raycast-extension-stocker",
      },
    },
  );

  const recent = data.filings.recent;

  // 10-K and 8-K
  const relevantIndices = recent.form
    .map((e, i) => {
      const is10k = e === "10-K";
      const is8k = e === "8-K";
      if (is10k || is8k) {
        return [e, i] as [string, number];
      }
      return null;
    })
    .filter((e): e is [string, number] => e !== null);

  return relevantIndices.map(([filing, idx]) => ({
    id: recent.accessionNumber[idx],
    filing,
    date: recent.filingDate[idx],
    url: secUrl
      .replace("[CIK]", cik)
      .replace(
        "[accessionNumber]",
        recent.accessionNumber[idx].replaceAll("-", ""),
      )
      .replace("[primaryDocument]", recent.primaryDocument[idx]),
  }));
}

export type GetSecFilingsResponse = Array<{
  id: string;
  filing: string;
  date: string;
  url: string;
}>;

type Address = {
  street1: string;
  street2: string | null;
  city: string;
  stateOrCountry: string;
  zipCode: string;
  stateOrCountryDescription: string;
};

type FormerName = {
  name: string;
  from: string;
  to: string;
};

export type SubmissionsResponse = {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  insiderTransactionForOwnerExists: number;
  insiderTransactionForIssuerExists: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing: Address;
    business: Address;
  };
  phone: string;
  flags: string;
  formerNames: FormerName[];
  filings: {
    recent: {
      accessionNumber: Array<string>;
      filingDate: Array<string>;
      reportDate: Array<string>;
      acceptanceDateTime: Array<string>;
      act: Array<string>;
      form: Array<string>;
      fileNumber: Array<string>;
      filmNumber: Array<string>;
      items: Array<string>;
      size: Array<number>;
      isXBRL: Array<1 | 0>;
      isInlineXBRL: Array<1 | 0>;
      primaryDocument: Array<string>;
      primaryDocDescription: Array<string>;
    };
  };
  files: Array<{
    name: string;
    filingCount: number;
    filingFrom: string;
    filingTo: string;
  }>;
};
