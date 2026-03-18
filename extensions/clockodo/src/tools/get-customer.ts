import { getCustomer } from "../clockodo";

type Input = {
  /**
   * The id of the customer
   */
  customerId: number;
};

export default async function (input: Input) {
  return getCustomer(input.customerId);
}
