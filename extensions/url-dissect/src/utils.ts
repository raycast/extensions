import { z } from "zod";

export function isURL(text: string): boolean {
  const schema = z.string().url();
  try {
    schema.parse(text);
    return true;
  } catch {
    return false;
  }
}

export type DisectedURL = {
  origin: string;
  protocol: string;
  domain: string;
  path: string;
  query: string;
  fragment: string;
};

export function dissectURL(url: string): DisectedURL {
  const urlObject = new URL(url);
  return {
    origin: urlObject.origin,
    protocol: urlObject.protocol,
    domain: urlObject.hostname,
    path: urlObject.pathname,
    query: urlObject.search,
    fragment: urlObject.hash,
  };
}
