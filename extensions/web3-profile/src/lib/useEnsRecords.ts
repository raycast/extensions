import { useQuery } from "@tanstack/react-query";
import { ensClient } from "./apollo";
import gql from "graphql-tag";
import { getProvider } from "wagmi/actions";

const ENS_GET_RECORDS = gql`
  query lookup($name: String!) {
    domains(first: 1, where: { name: $name }) {
      resolver {
        texts
      }
    }
  }
`;

export const ENS_RECORDS = {
  BTC: "BTC",
  description: "description",
  discord: "com.discord",
  DOGE: "DOGE",
  email: "email",
  ETH: "ETH",
  github: "com.github",
  instagram: "com.instagram",
  LTC: "LTC",
  pronouns: "pronouns",
  reddit: "com.reddit",
  snapchat: "com.snapchat",
  telegram: "org.telegram",
  twitter: "com.twitter",
  url: "url",
  website: "website",
  cover: "cover",
  keywords: "keywords",
} as const;
export const ENS_RECORDS_KEYS = Object.values(ENS_RECORDS);

export const fetchRecords = async (ensName: string) => {
  const response = await ensClient.query({
    query: ENS_GET_RECORDS,
    variables: {
      name: ensName,
    },
  });

  const data = response.data.domains[0];

  const resolver = await getProvider().getResolver(ensName);
  const supportedRecords = Object.values(ENS_RECORDS);
  const rawRecordKeys = (data?.resolver.texts || []) as typeof ENS_RECORDS_KEYS;
  const recordKeys = rawRecordKeys?.filter((key) => supportedRecords.includes(key));

  const recordValues = await Promise.all(recordKeys.map((key: string) => resolver?.getText(key)));

  const records = recordKeys.reduce((records, key, i) => {
    return {
      ...records,
      ...(recordValues[i] ? { [key]: recordValues[i] } : {}),
    };
  }, {});

  return records;
};

export function useEnsRecords({ name }: { name: string }) {
  const { data, isLoading } = useQuery<{ [key: string]: string }>(["ens-records", name], () => fetchRecords(name), {
    enabled: Boolean(name),
  });
  return { data, isLoading };
}
