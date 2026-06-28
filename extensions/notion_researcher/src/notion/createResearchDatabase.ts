import { Client } from "@notionhq/client";
import { getPreferenceValues } from "@raycast/api";
import { Status } from "./types";
import { Preferences } from "../config/index";

const preferences = getPreferenceValues<Preferences>();

const notion = new Client({ auth: preferences.notionApiKey });

export async function createResearchDatabase(parentKey: string) {
  const response = await notion.databases.create({
    parent: { page_id: parentKey },
    title: [
      {
        text: {
          content: "Research Papers",
        },
      },
    ],
    properties: {
      Title: {
        title: {},
        type: "title",
      },
      Tags: {
        multi_select: { options: [] },
        type: "multi_select",
      },
      Category: {
        multi_select: { options: [] },
        type: "multi_select",
      },
      Authors: {
        multi_select: { options: [] },
        type: "multi_select",
      },
      Status: {
        select: {
          options: [
            { name: Status.NotRead, color: "gray" },
            { name: Status.InProgress, color: "blue" },
            { name: Status.Read, color: "green" },
          ],
        },
        type: "select",
      },
      URL: {
        url: {},
        type: "url",
      },
      Date: {
        date: {},
        type: "date",
      },
      "Reader Url": {
        type: "url",
        url: {},
      },
    },
  });

  return response;
}
