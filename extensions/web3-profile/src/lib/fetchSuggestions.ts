import { getEnsAddress } from "@wagmi/core";
import { zeroAddress } from "viem";
import { mainnet } from "viem/chains";
import gql from "graphql-tag";
import { ensClient } from "./apollo";
import { normalizeEnsName, wagmiConfig } from "./ens";

const ENS_SUGGESTIONS = gql`
  query lookup($name: String!) {
    domains(
      first: 75
      where: { name_starts_with: $name, resolvedAddress_not: null }
      orderBy: labelName
      orderDirection: asc
    ) {
      name
      owner {
        id
      }
    }
  }
`;

export const fetchSuggestions = async (recipient: string): Promise<string[]> => {
  if (recipient.length <= 2) return [];

  try {
    const query = recipient.toLowerCase();
    const exactLookup = async () => {
      try {
        const name = normalizeEnsName(recipient.includes(".") ? recipient : `${recipient}.eth`);
        const address = await getEnsAddress(wagmiConfig, { name, chainId: mainnet.id });
        return address ? name : null;
      } catch {
        return null;
      }
    };
    const [subgraphResult, exactName] = await Promise.all([
      ensClient
        .query<{ domains: { name: string; owner: { id: string } }[] }>({
          query: ENS_SUGGESTIONS,
          variables: { name: query },
        })
        .catch(() => undefined),
      exactLookup(),
    ]);

    const indexedNames = (subgraphResult?.data?.domains ?? [])
      .filter((domain) => domain.owner.id !== zeroAddress)
      .map(({ name }) => name)
      .sort((a, b) => a.length - b.length)
      .slice(0, 40);
    return [...new Set(exactName ? [exactName, ...indexedNames] : indexedNames)];
  } catch {
    return [];
  }
};
