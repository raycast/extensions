import { useDefaultHeaders } from "./headers.js";
import fetch from "node-fetch";

async function save(url: string) {
  const readerAPI = "https://readwise.io/api/v3/save/";
  const body = {
    url,
  };

  const headers = useDefaultHeaders();

  const response = await fetch(readerAPI, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });
  return response;
}

function isValid(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export async function saveURL(url: string) {
  if (!isValid(url)) {
    throw new Error("Invalid URL");
  }

  await save(url);
}
