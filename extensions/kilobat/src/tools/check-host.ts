import { kilobat, WhyReport } from "../kilobat";

type Input = {
  /** The URL or host name to check, for example "api.openai.com" or "https://github.com". */
  target: string;
};

/** Checks why a URL or host can or can't be reached from this Mac, layer by layer. */
export default async function tool(input: Input) {
  return kilobat<WhyReport>(["why", input.target, "--json"], 60_000);
}
