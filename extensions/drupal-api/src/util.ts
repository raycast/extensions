import got from "got";
import { load as cheerioLoad } from "cheerio";
import { DrupalVersionMachineCode, DrupalVersions, RecordItem } from "./types";

export const drupalVersions: { name: DrupalVersions; code: DrupalVersionMachineCode }[] = [
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
  {
    name: DrupalVersions.Drupal6,
    code: DrupalVersionMachineCode.Drupal6,
  },
  {
    name: DrupalVersions.Drupal5,
    code: DrupalVersionMachineCode.Drupal5,
  },
  {
    name: DrupalVersions.Drupal4_7,
    code: DrupalVersionMachineCode.Drupal4_7,
  },
  {
    name: DrupalVersions.Drupal4_6,
    code: DrupalVersionMachineCode.Drupal4_6,
  },
];

export const getDrupalApiResults = async (drupalVersion: DrupalVersionMachineCode, searchQuery: string) => {
  const searchUrl = `https://api.drupal.org/api/drupal/${drupalVersion}/search`;
  const { body } = await got(`${searchUrl}/${searchQuery}`, {
    headers: { "user-agent": "Raycast Drupal API Extension" },
  });
  const $ = cheerioLoad(body);
  const tableRows = $(".view-api-search tbody tr");

  const records: RecordItem[] = tableRows.toArray().map((item) => {
    const recordLink = $("td.views-field-title", item);
    const recordUrl = $("a", recordLink).attr("href");
    if (!recordUrl) {
      return {} as RecordItem;
    }
    const record: RecordItem = {
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
