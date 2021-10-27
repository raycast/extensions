export const attributes = (attribs: [name: string, value: string][]) =>
  attribs.map(([key, value]) => `**${key}:** ${value}`).join('\n\n');

export const codeBlock = (code: string) => '```' + code + '```';
