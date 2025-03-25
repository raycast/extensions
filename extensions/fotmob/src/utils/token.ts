import fetch from "cross-fetch";

export async function getHeaderToken() {
  // This URL endpoint came from this fix https://github.com/probberechts/soccerdata/issues/742
  const url = "http://46.101.91.154:6006/";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch header token");
  }
  return (await response).json();
}
