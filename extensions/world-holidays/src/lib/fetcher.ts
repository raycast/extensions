/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-undef */
import fetch from 'node-fetch';

export default async function fetcher<T>(
  // @ts-ignore
  input: RequestInfo,
  // @ts-ignore
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  return (await res.json()) as T;
}
