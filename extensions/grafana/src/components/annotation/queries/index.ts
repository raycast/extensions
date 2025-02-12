/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: remove any types and be fully-type safe
import fetch from "node-fetch";
import { preferences } from "../../../helpers/preferences";
import { Annotation, Patch } from "./../interface";

export async function annotationGetQuery(signal: AbortSignal | any): Promise<any> {
  return await fetch(`${preferences.rootApiUrl}/api/annotations?from=1506676478816&to=${Date.now()}&limit=10`, {
    method: "get",
    signal: signal,
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
  });
}

export async function annotationCreationQuery(body: Annotation): Promise<any> {
  const response = await fetch(`${preferences.rootApiUrl}/api/annotations`, {
    method: "post",
    body: JSON.stringify({
      text: body.text,
      tags: ["test"],
      // dashboardId: 47
      // time: 1638391687000,
    }),
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
  });

  if (!response.ok) {
    console.error(response.statusText);
    return Promise.reject(response.statusText);
  }

  console.log(response.statusText);
  console.log(response.text);

  return response;
}

export async function annotationPatchQuery(valuesToPatch: Patch, id: number): Promise<any> {
  return await fetch(`${preferences.rootApiUrl}/api/annotations/${id}`, {
    method: "patch",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
    body: JSON.stringify({
      text: valuesToPatch.text,
    }),
  });
}

export async function annotationDeleteQuery(id: number): Promise<any> {
  return await fetch(`${preferences.rootApiUrl}/api/annotations/${id}`, {
    method: "delete",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer ${preferences.apikey}`,
    },
  });
}
