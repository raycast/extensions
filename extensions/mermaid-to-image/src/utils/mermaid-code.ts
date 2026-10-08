/**
 * Clean Mermaid code by removing markdown fences if present.
 */
export function cleanMermaidCode(mermaidCode: string): string {
  let cleanCode = mermaidCode;
  if (cleanCode.includes("```mermaid")) {
    const mermaidMatch = cleanCode.match(/```mermaid\s*\n([\s\S]*?)```+/);
    if (mermaidMatch && mermaidMatch[1]) {
      cleanCode = mermaidMatch[1];
    }
  }
  return cleanCode;
}
