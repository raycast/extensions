import { ErrorResponse } from "./types";

export async function parseResponse(response: Response) {
  const res = await response.json();
  if (!response.ok) throw new Error((res as ErrorResponse).msg);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res as any;
}
