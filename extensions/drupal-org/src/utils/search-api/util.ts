import got from "got";
import { load as cheerioLoad } from "cheerio";
import { ApiItem } from "./types";
import { DrupalVersionMachineCode, DrupalVersions } from "../general/types";

export const drupalVersions: { name: DrupalVersions; code: DrupalVersionMachineCode }[] = [
  {
    name: DrupalVersions.Drupal11,
    code: DrupalVersionMachineCode.Drupal11,
  },
  {
    name: DrupalVersions.Drupal10,
    code: DrupalVersionMachineCode.Drupal10,
  },
  {
    name: DrupalVersions.Drupal9,
    code: DrupalVersionMachineCode.Drupal9,
  },
  {
    name: DrupalVersions.Drupal8,
    code: DrupalVersionMachineCode.Drupal8,
  },
  {
    name: DrupalVersions.Drupal7,
    code: DrupalVersionMachineCode.Drupal7,
  },
];

export const getDrupalApiResults = async (drupalVersion: DrupalVersionMachineCode, searchQuery: string) => {
  const searchUrl = `https://api.drupal.org/api/drupal/${drupalVersion}/search`;
  const { body } = await got(`${searchUrl}/${searchQuery}`, {
    headers: { "user-agent": "Raycast Drupal.org Extension" },
  });
  const $ = cheerioLoad(body);
  const tableRows = $(".views-element-container tbody tr");

  const records: ApiItem[] = tableRows.toArray().map((item) => {
    const recordLink = $("td.views-field-title", item);
    const recordUrl = $("a", recordLink).attr("href");
    if (!recordUrl) {
      return {} as ApiItem;
    }
    const record: ApiItem = {
      title: $("td.views-field-title", item).text().trim(),
      type: $("td.views-field-object-type", item).text().trim(),
      location: $("td.views-field-file-name", item).text().trim(),
      description: $("td.views-field-summary", item).text().trim(),
      url: "https://api.drupal.org" + recordUrl,
    };

    return record;
  });

  return records;
};
