import fetch, { Headers } from "node-fetch";
import { ApiResponse } from "../types/apiResponse";

export async function postInterfacesToGenerate(input: string, setIsLoading: (isLoading: boolean) => void) {
  setIsLoading(true);
  return fetch("https://ts-faker.vercel.app/api/generateFakeData", {
    method: "POST",
    body: input,
    headers: new Headers({ "Content-Type": "text/plain" }),
  }).then<ApiResponse[]>(async (response) => {
    setIsLoading(false);

    if (response.ok) {
      const responseJson = (await response.json()) as ApiResponse[];
      if (responseJson.length === 0) {
        throw new Error("Mock data generation was not successful");
      }
      return responseJson;
    }

    throw new Error("Mock data generation was not successful");
  });
}
