import { ThingsTaskParams } from "./types";

export function buildThingsUrl(params: ThingsTaskParams): string {
  const q = new URLSearchParams();
  q.set("title", params.title);
  if (params.notes) q.set("notes", params.notes);
  if (params.when) q.set("when", params.when);
  if (params.tags?.length) q.set("tags", params.tags.join(","));
  if (params.list) q.set("list", params.list);

  // URLSearchParams encodes spaces as +, but Things expects %20
  const queryString = q.toString().replace(/\+/g, "%20");

  // show-quick-entry: Opens Quick Entry for review (doesn't create until user confirms)
  // add: Creates task immediately
  const action = params.showQuickEntry ? "show-quick-entry" : "add";
  return `things:///${action}?${queryString}`;
}
