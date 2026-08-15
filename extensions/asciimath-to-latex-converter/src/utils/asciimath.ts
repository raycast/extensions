import asciimathToLatex from "asciimath-to-latex";

export function convertAsciiMathToLatex(input: string): string {
  try {
    return asciimathToLatex(input);
  } catch {
    return "Error parsing expression";
  }
}
