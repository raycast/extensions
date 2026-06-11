import { getCustomer } from "../clockodo";

type Input = {
  /**
   * The id of the customer
   */
  customerId: number;
};

/** Loads a Clockodo customer by id (includes its name). */
export default async function (input: Input) {
  return getCustomer(input.customerId);
}
