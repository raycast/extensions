import exa from "../exa";

type Input = {
  /**
   * The URLs of the webpages to retrieve the contents of.
   */
  urls: string[];
};

/**
 * Retrieves the full contents of the webpages.
 *
 * @returns The contents of the webpages, including the title, url, and text of the content of the similar results.
 */
export default async function (input: Input) {
  const { urls } = input;

  const { results } = await exa.getContents(urls, { text: true, useAutoprompt: true });

  return results.map((result) => ({
    title: result.title,
    url: result.url,
    text: result.text,
  }));
}
