import exa from "../exa";

type Input = {
  /**
   * The URL of the webpage to retrieve the contents of.
   */
  url: string;
};

/**
 * Retrieves the full contents of the webpage.
 *
 * @returns The contents of the webpage, including the title, url, and text of the content.
 */
export default async function (input: Input) {
  const { url } = input;

  const { results } = await exa.getContents([url], { text: true, useAutoprompt: true });

  const first = results[0];
  if (!first) return null;

  return {
    title: first.title,
    url: first.url,
    text: first.text,
  };
}
