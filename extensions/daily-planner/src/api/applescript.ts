export const quoteAndEscape = (text: string) => '"' + text.replaceAll('"', '\\"').replaceAll("\n", "\\n") + '"';

export const toAppleScriptList = (texts: string[]) => "{" + texts.map(quoteAndEscape).join(", ") + "}";

export const toAppleScriptDate = (date: Date) => `date "${date.toDateString()}"`;

export const toAppleScriptDateTime = (date: Date) => `date "${date.toLocaleString().replace(",", "")}"`;
