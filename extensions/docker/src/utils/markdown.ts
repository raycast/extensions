export const attributes = (attribs: [name: string, value: string][]) =>
  attribs.map(([key, value]) => `**${key}:** ${value}`).join('\n\n');

export const codeBlock = (code: string) => '```\n' + code + '\n```';

export const inlineCode = (code: string) => '`' + code + '`';
