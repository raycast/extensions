import { Response } from "node-fetch";
import { match } from "ts-pattern";

interface ResponseError {
  message: string;
}

export async function handleErrors(response: Promise<Response>) {
  return match(await response)
    .with({ status: 400 }, async (r) => {
      throw new Error(((await r.json()) as ResponseError).message);
    })
    .with({ status: 401 }, async (r) => {
      throw new Error(((await r.json()) as ResponseError).message);
    })
    .with({ status: 500 }, async (r) => {
      throw new Error(((await r.json()) as ResponseError).message);
    })
    .otherwise((resp) => resp);
}
