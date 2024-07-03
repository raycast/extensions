import * as cheerio from "cheerio";

export type Package = {
  name: string;
  description: string;
  version: string;
  updatedOn: string;
};

export function scrapePackages(html: string): Package[] {
  try {
    const $ = cheerio.load(html);

    const packages: Package[] = [];

    $("a.package-snippet").each((_, element) => {
      const name = $(element).find("span.package-snippet__name").text().trim();
      const description = $(element).find("p.package-snippet__description").text().trim();
      const version = $(element).find("span.package-snippet__version").text().trim();
      const created = $(element).find("span.package-snippet__created").text().trim();

      packages.push({ name, description, version, updatedOn: created });
    });

    return packages;
  } catch (error) {
    console.error("Error fetching the URL:", error);
    return [];
  }
}
