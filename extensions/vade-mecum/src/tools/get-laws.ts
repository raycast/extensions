import { LAWS } from "../constants";
import { Law } from "../types";

/**
 * This tool returns all laws available in the application without the shortNumber property.
 * @returns {Promise<Omit<Law, 'shortNumber'>[]>} A promise that resolves to an array of laws without shortNumber
 */
export default async function tool(): Promise<Omit<Law, "shortNumber">[]> {
  // Return a copy of LAWS with shortNumber excluded from each law
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return LAWS.map(({ shortNumber, ...rest }) => rest);
}
