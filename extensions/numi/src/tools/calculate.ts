import { getPreferenceValues } from "@raycast/api";
import { runQuery } from "../services/requests";

type Input = {
  /**
   * The expression to evaluate, in Numi's natural-language syntax. Pass the
   * user's own wording through where possible: Numi parses natural language
   * itself, so forms like "340 GBP to USD", "15% of 200", "3 days from now"
   * and "0xff in binary" all work without being rewritten.
   */
  expression: string;
};

export default async function calculate(input: Input) {
  const { use_numi_cli } = getPreferenceValues<Preferences>();
  const results = await runQuery(input.expression, use_numi_cli);
  const result = results[0]?.trim();

  if (!result) {
    throw new Error(`Numi could not evaluate "${input.expression}".`);
  }

  return { expression: input.expression, result };
}
