import got from "got";
import { load as cheerioLoad } from "cheerio";
import { RecordItem } from "./types";

const searchUrl = "https://api.drupal.org/api/drupal/10/search";

export const getDrupalApiResults = async (searchQuery: string) => {
  const { body } = await got(`${searchUrl}/${searchQuery}`, {
    headers: { "user-agent": "Raycast Drupal API Extension" },
  });
  const $ = cheerioLoad(body);
  const tableRows = $(".view-api-search tbody tr");

  const records: RecordItem[] = tableRows
    .toArray()
    .map((item) => {
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
        url: 'https://api.drupal.org' + recordUrl,
      };

      return record;
    });

  return records;
};