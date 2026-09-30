import { listAddresses } from "../api/list-addresses";

type Input = {
  /**
   * Filter addresses by the given query.
   */
  query: string;
};

export default async function (input: Input) {
  const addresses = await listAddresses(input.query);
  return addresses;
}
