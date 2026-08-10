// Helper class for font conversion
export class PseudoFont {
  fontName: string;
  fontLower: string[];
  fontUpper: string[];
  fontDigits: string[];
  experimental: boolean;
  private referenceLower = "abcdefghijklmnopqrstuvwxyz";
  private referenceUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  private referenceDigits = "0123456789";

  constructor(
    fontName: string,
    fontLower: string | string[],
    fontUpper: string | string[],
    fontDigits: string | string[],
  ) {
    this.fontName = fontName;
    this.fontLower = Array.isArray(fontLower) ? fontLower : [...fontLower];
    this.fontUpper = Array.isArray(fontUpper) ? fontUpper : [...fontUpper];
    this.fontDigits = Array.isArray(fontDigits) ? fontDigits : [...fontDigits];
    this.experimental = false;
  }

  convert(rawText: string): string {
    return [...rawText]
      .map((char) => {
        if (this.referenceLower.includes(char)) {
          return this.fontLower[this.referenceLower.indexOf(char)];
        } else if (this.referenceUpper.includes(char)) {
          return this.fontUpper[this.referenceUpper.indexOf(char)];
        } else if (this.referenceDigits.includes(char)) {
          return this.fontDigits[this.referenceDigits.indexOf(char)];
        }
        return char;
      })
      .join("");
  }
}
