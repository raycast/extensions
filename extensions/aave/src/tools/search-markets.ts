import { ChainId, chainId } from "@aave/client";
import { getChains, getMarkets } from "../lib/api";
import { AI } from "@raycast/api";
import dedent from "dedent";

type Input = {
  /**
   * List of chain names to search for markets. Leave empty to search for all chains.
   */
  chains?: string[];
};

export default async function searchMarkets(input: Input) {
  const allChains = await getChains();

  let chainIds = allChains.map((chain) => chain.chainId);

  if (input.chains && input.chains.length > 0) {
    const result = await AI.ask(
      dedent`
      Here is a list of all available chain names with their chain IDs:
      
      ${allChains.map((chain) => `- ${chain.name}: ${chain.chainId}`).join("\n")}
      
      Return the chain IDs in a JSON list, separated by commas and with no additional text, that best match the semantic meaning of the following description: ${input.chains.join(", ")}
      
      You should return at least one chain name.
      
      The output should be a JSON list with the following structure:
      \`\`\`json
      [1, 401, 3]
      \`\`\`

      Don't wrap the output in markdown \`\`\`json\`\`\` code block.
      `,
      {
        creativity: "low",
      },
    );

    chainIds = (JSON.parse(result) as number[]).map((id) => chainId(id));
  }

  return getMarkets(chainIds);
}
