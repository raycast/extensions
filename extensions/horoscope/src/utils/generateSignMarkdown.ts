export default function generateSignMarkdown(sign: string) {
  const proper = sign.slice(0, 1).toUpperCase() + sign.slice(1);
  return `# Sign: ${proper} \n\n`;
}
