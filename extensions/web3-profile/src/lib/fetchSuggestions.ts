import { zeroAddress } from "viem";
import gql from "graphql-tag";
import { ensClient } from "./apollo";
import { mainnetClient, normalizeEnsName } from "./ens";

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

export const fetchSuggestions = async (
  recipient: string,
  setSuggestions: (suggestions: string[]) => void,
  setIsFetching: (arg: boolean) => void = () => null
) => {
  if (recipient.length <= 2) {
    setSuggestions([]);
    return;
  }

  setIsFetching(true);
  try {
    const query = recipient.toLowerCase();
    const exactLookup = async () => {
      try {
        const name = normalizeEnsName(recipient.includes(".") ? recipient : `${recipient}.eth`);
        const address = await mainnetClient.getEnsAddress({ name });
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
    setSuggestions([...new Set(exactName ? [exactName, ...indexedNames] : indexedNames)]);
  } catch {
    setSuggestions([]);
  } finally {
    setIsFetching(false);
  }
};
