import { constants } from "ethers";
import isEmpty from "lodash.isempty";
import { ensClient } from "./apollo";
import gql from "graphql-tag";

const ENS_SUGGESTIONS = gql`
  query lookup($name: String!) {
    domains(
      first: 75
      where: { name_starts_with: $name, resolvedAddress_not: null }
      orderBy: labelName
      orderDirection: asc
    ) {
      name
      resolver {
        addr {
          id
        }
      }
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
  if (recipient.length > 2) {
    setIsFetching(true);
    const recpt = recipient.toLowerCase();
    const result = await ensClient.query<{
      domains: { name: string; owner: { id: string } }[];
    }>({
      query: ENS_SUGGESTIONS,
      variables: {
        amount: 75,
        name: recpt,
      },
    });

    if (!isEmpty(result?.data?.domains)) {
      const domains = result.data.domains;
      const lookupResult = domains
        ?.filter((domain) => domain.owner.id !== constants.AddressZero)
        .map(({ name }) => name)
        .sort((a, b) => a.length - b.length)
        .slice(0, 40);

      setSuggestions(lookupResult);
    }
  } else {
    setSuggestions([]);
  }
  setIsFetching(false);
};
