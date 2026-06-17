import { ErrorResponse, SuccessResult } from "./types";

export async function parseResponse(response: Response) {
  const res = await response.json();
  if (!response.ok) throw new Error((res as ErrorResponse).msg);
  return (res as SuccessResult<never>).data;
}
