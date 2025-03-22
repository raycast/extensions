import { load as cheerioLoad } from "cheerio";
import got, { SearchParameters } from "got";
import { ChangeRecord } from "./types";

const drupalCRSearchUrlBase = "https://www.drupal.org/list-changes/drupal";

export const getDrupalChangeRecords = async (searchContent: string) => {
  const searchParams = {} as SearchParameters;
  if (searchContent) {
    searchParams.keywords_description = searchContent;
  }
  const { body } = await got(drupalCRSearchUrlBase, {
    searchParams: searchParams,
    headers: { "user-agent": "Raycast Drupal.org Extension" },
  });
  const $ = cheerioLoad(body);
  const changes = $(".view-change-records tbody tr");

  const records = changes
    .toArray()
    .map((el) => {
      const recordLink = $("td:nth-child(3)", el);
      const recordUrl = $("a", recordLink).attr("href");
      if (!recordUrl) {
        return {} as ChangeRecord;
      }
      const recordNid = recordUrl.split("/").pop();
      if (!recordNid) {
        return {} as ChangeRecord;
      }
      const record: ChangeRecord = {
        created: new Date($("td:nth-child(2)", el).text()),
        title: $("a", recordLink).text().trim(),
        changeVersion: $("td:nth-child(1)", el).text().trim(),
        id: recordNid,
        url: recordUrl,
      };
      return record;
    })
    .filter((el) => {
      return el.id ? true : false;
    });
  return records;
};
