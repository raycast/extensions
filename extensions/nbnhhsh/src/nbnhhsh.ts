import fetch from "node-fetch";

export interface IGuss {
  name: string;
  trans: string[];
}

export const guess = async (text: string, signal: AbortSignal): Promise<IGuss[]> => {
  if (!text) return [];

  const response = await fetch("https://lab.magiconch.com/api/nbnhhsh/guess", {
    method: "post",
    body: JSON.stringify({ text }),
    headers: {
      "Content-Type": "application/json"
    },
    signal,
  });

  return await response.json() as Promise<IGuss[]>;
}