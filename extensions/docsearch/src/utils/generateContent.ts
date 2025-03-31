/* eslint-disable @typescript-eslint/no-explicit-any */
export function generateContent(result: any) {
  const title = `### ${result.title}\n---\n`;
  const body = `${
    result?._highlightResult?.content?.value ||
    result?._highlightResult?.text?.value ||
    result?._highlightResult?.subtitle?.value ||
    result.content ||
    result.description ||
    ""
  }`;

  return body ? title + body : undefined;
}
