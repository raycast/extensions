import fetch from "node-fetch";
import { Cache } from "@raycast/api";

import { Activity, GetSheetResult } from "./types";
import { isCacheExpired, isNil } from "../utils";
import { preferences } from "../config";

type GetActivitiesOptions = {
  search?: string;
};

const cache = new Cache();

const getActivities = async (options: GetActivitiesOptions = {}) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${preferences.sheetId}/values/${preferences.sheetName}?valueRenderOption=FORMATTED_VALUE&key=${preferences.apiKey}`;

  const body = await (async () => {
    if (cache.has(url)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const { timestamp, body: bodyCache } = JSON.parse(cache.get(url)!) as { timestamp: number; body: GetSheetResult };

      if (!isCacheExpired(timestamp)) {
        return bodyCache;
      }
    }

    const response = await fetch(url);

    if (response.status < 200 || response.status > 299) {
      throw new Error("Couldn't retrieve the activities from the provided spreadsheet. Please check your preferences.");
    }

    const body = (await response.json()) as GetSheetResult;

    cache.set(url, JSON.stringify({ timestamp: Date.now(), body }));

    return body;
  })();

  const sheetHeaders = body.values[0];
  const sheetBody = body.values.slice(1);
  const sheet = sheetBody.map((arr) =>
    Object.assign({}, ...sheetHeaders.map((k, i) => ({ [k.toLowerCase()]: arr[i]?.trim() })))
  );

  const activities: Activity[] = sheet
    .map((entry) => ({
      confirmDate: entry["bokad"],
      projectName: entry["projeknamn"],
      responsibleMail: entry["ansvarig epost"],
      date: entry["datum"],
      time: entry["tid"],
      company: entry["bokat företag"],
      switchboard: entry["växelnummer"],
      name: entry["kontaktnamn"],
      title: entry["befattning"],
      email: entry["e-post"],
      cellPhone: entry["mobilnummer"],
      workPhone: entry["arbetsnummer"],
      description: entry["beskrivning"],
      crm2Id: entry["clickup id"],
      eventId: entry["kalender id"],
      crmId: entry["s2 id"],
      crmAccount: entry["s2 account"],
      conversationId: entry["front conversation id"],
      orderWorth: entry["ordervärde"],
    }))
    .reverse();

  if (!isNil(options.search)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const searchQuery = options.search!.toLowerCase();

    return activities
      .filter(
        (x) =>
          x.email.toLowerCase().includes(searchQuery) ||
          x.name.toLowerCase().includes(searchQuery) ||
          x.company.toLowerCase().includes(searchQuery) ||
          x.projectName.toLowerCase().includes(searchQuery)
      )
      .slice(0, 20);
  }

  return activities.slice(0, 20);
};

export const ActivityService = Object.freeze({
  getActivities,
});
