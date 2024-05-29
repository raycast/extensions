import got from "got";
import { CheerioAPI, load as cheerioLoad } from "cheerio";
import { Project } from "./types";

const getRecords = ($cheerioItems: CheerioAPI): Project[] => {
  const rows = $cheerioItems("ol.search-results li.search-result");
  return rows.toArray().map((item) => {
    const moduleLink = $cheerioItems("h3.title", item);
    const moduleUrl = $cheerioItems("a", moduleLink).attr("href");
    if (!moduleUrl) {
      return {} as Project;
    }
    const createdBy = $cheerioItems(".username", item).text().trim();
    const record: Project = {
      title: $cheerioItems("h3.title", item).text().trim(),
      createdBy,
      description: $cheerioItems(".search-snippet", item).text().trim(),
      type: $cheerioItems(".search-info", item).text().trim().replace(" project", ""),
      url: moduleUrl,
    };

    return record;
  });
};

const fetchApi = async (query: string, type: string) => {
  const searchUrl = `https://www.drupal.org/search/site/${query}?f%5B0%5D=ss_meta_type%3A${type}`;
  const { body } = await got(searchUrl, {
    headers: { "user-agent": "Raycast Drupal.org Extension" },
  });
  return body;
};

export const getProjectResults = async (searchQuery: string, type: string) => {
  const moduleData = await fetchApi(searchQuery, "module");
  const themeData = await fetchApi(searchQuery, "theme");
  const distributionData = await fetchApi(searchQuery, "distribution");

  switch (type) {
    case "modules":
      return getRecords(cheerioLoad(moduleData));
    case "themes":
      return getRecords(cheerioLoad(themeData));
    case "distributions":
      return getRecords(cheerioLoad(distributionData));
    default:
      return [
        ...getRecords(cheerioLoad(moduleData)),
        ...getRecords(cheerioLoad(themeData)),
        ...getRecords(cheerioLoad(distributionData)),
      ];
  }
};
