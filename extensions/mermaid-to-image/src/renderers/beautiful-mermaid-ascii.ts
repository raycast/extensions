import { BeautifulMermaidModule } from "./beautiful-mermaid-runtime";

export function renderBeautifulMermaidAscii(
  code: string,
  dependencies: Pick<BeautifulMermaidModule, "renderMermaidASCII">,
): string {
  return dependencies.renderMermaidASCII(code, {
    useAscii: true,
    colorMode: "none",
  });
}
