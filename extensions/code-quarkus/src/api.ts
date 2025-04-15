import fetch from "node-fetch";

export const BASE_URL = "https://code.quarkus.io";

export async function fetchQuarkusExtensions(version: string) {
  console.log("Fetching dependencies...");
  //const response = {ok:false, status:'', statusText:'',json: () => Promise.resolve([])};
  const response = await fetch(`${BASE_URL}/api/extensions/stream/${version}?platformOnly=false`, {});

  console.log("Response status:", response.status);
  return response;
}

export async function getQuarkusVersion() {
  return await fetch(`${BASE_URL}/api/streams`, {});
}
