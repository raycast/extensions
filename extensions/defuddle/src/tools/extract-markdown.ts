import { extractMarkdown } from "../lib/defuddle";

type Input = {
  /** The complete HTTP or HTTPS URL of the public page to read. */
  url: string;
};

export default async function tool(input: Input) {
  return extractMarkdown(input.url, { showProgress: false });
}
