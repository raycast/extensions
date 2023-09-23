/* eslint-disable @typescript-eslint/no-explicit-any */
export function generateContent(result: any) {
  const content = `### ${result.title}\n---\n${
    result?._highlightResult?.content?.value ||
    result?._highlightResult?.text?.value ||
    result?._highlightResult?.subtitle?.value ||
    result.content
  }`;

  return content;
}
