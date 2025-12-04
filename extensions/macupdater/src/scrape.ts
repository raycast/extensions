import scrape from "scrape-it";

export interface Update {
  name: string;
  icon: string;
  link: string;
  description: string;
  version: string;
  free: boolean;
  major: boolean;
}

async function scrapeMacUpdater(url: string, columnOffset = 0): Promise<Update[]> {
  const { data } = await scrape<{ updates: Update[] }>(url, {
    updates: {
      listItem: "tr.t_content",
      data: {
        name: `td:nth-child(${columnOffset + 2})`,
        icon: {
          selector: `td:nth-child(${columnOffset + 1}) img`,
          attr: "src",
        },
        link: {
          selector: `td:nth-child(${columnOffset + 2}) a`,
          attr: "href",
          convert: (value: string) => `https://macupdater.net/app_updates/${value}`,
        },
        description: {
          selector: `td:nth-child(${columnOffset + 2}) a`,
          attr: "data-tippy-content",
        },
        version: {
          selector: `td:nth-child(${columnOffset + 4})`,
        },
        major: {
          selector: `td:nth-child(${columnOffset + 5})`,
          how: "html",
          convert: (value: string) => value.includes("badge_updateinfo_major"),
        },
        free: {
          selector: `td:nth-child(${columnOffset + 3})`,
          how: "html",
          convert: (value: string) => value.includes("badge_price_free"),
        },
      },
    },
  });
  return data.updates;
}

export { scrapeMacUpdater };
