import * as cheerio from "cheerio";
import { Day, FoodResult } from "./types";
import { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";

export const parseWeek = (html: string): FoodResult => {
  const $ = cheerio.load(html);

  const type1 = $(
    "#content-main > div:nth-child(2) > div.tx-bwrk-speiseplan.tx-bwrk-speiseplan__type-default > div.tx-bwrkspeiseplan-woche",
  );
  const type2 = $(
    "#content-main > div:nth-child(4) > div.tx-bwrk-speiseplan.tx-bwrk-speiseplan__type-default > div.tx-bwrkspeiseplan-woche",
  );
  const element = type1.length
    ? type1
    : type2.length
      ? type2
      : $(
          "#content-main > div:nth-child(1) > div.tx-bwrk-speiseplan.tx-bwrk-speiseplan__type-default > div.tx-bwrkspeiseplan-woche",
        );

  const days: Day[] = [];
  let currentDay: Day;

  element.children().each((_, child) => {
    const $child = $(child);
    const classList = $child.attr("class")?.split(" ") || [];

    if (!classList.some((c) => c.startsWith("tx-bwrkspeiseplan"))) return;

    if (classList.includes("tx-bwrkspeiseplan__dayHeadline")) {
      if (currentDay) days.push(currentDay);

      const dateParts = $child.text().split(", ")[1].split(".");
      currentDay = {
        date: new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])),
        mealTypes: [],
      };
    }

    if (classList.includes("tx-bwrkspeiseplan__hauptgerichte")) {
      const mealTypes = $child.find("> div:nth-child(2) > div").children().not(".tx-bwrkspeiseplan__bar--footer");

      mealTypes.each((_, mt) => {
        const $mt = $(mt);
        const tHead = $mt.find("thead span").first();
        const mealTypeName = tHead.length ? tHead.text() : "Hauptgericht";

        currentDay.mealTypes.push({
          name: mealTypeName,
          meals: parseTableBody($mt.find("tbody"), $),
        });
      });
    }

    if (classList.includes("tx-bwrkspeiseplan__pastatheke")) {
      currentDay.mealTypes.push({
        name: "Pasta",
        meals: parseTableBody($child.find("tbody"), $),
      });
    }
  });

  const supplements = $(".tx-bwrkspeiseplan__legendfooter > div > div > small")
    .html()!
    .split("<sup>")
    .map((e) => ({
      id: e.split("</sup>")[0].replace(")", ""),
      value: e.split("</sup>")[1]?.trim(),
    }))
    .filter((e) => e.id && e.value);

  const priceCategories = $(
    "div.tx-bwrk-speiseplan.tx-bwrk-speiseplan__type-default div.tx-bwrkspeiseplan-woche div.row.tx-bwrkspeiseplan__header div.col-xs-12.col-lg-4.col-lg-push-8 div > div > ul",
  )
    .text()
    .replace(/\t/g, "")
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p);

  return {
    days,
    supplements,
    priceCategories,
  };
};

const parseTableBody = ($body: Cheerio<Element>, $: CheerioAPI) => {
  return $body
    .children()
    .map((_, row) => {
      const $row = $(row);
      const supplements = $row.find("td:first-child sup").text() || "";
      const mealName = $row.find("td:first-child").text().split("\n")[0].replace(supplements, "").trim();

      const prices: number[] = $row
        .find("td:nth-child(2)")
        .text()
        .trim()
        .split("  ")
        .map((p) => parseFloat(p.replaceAll("€ ", "").replaceAll(",", ".")));

      const icons = $row
        .find("td:nth-child(3) > i.icon, td:nth-child(3) > img, td:nth-child(3) span.icon__not-veggie")
        .map((_, a) => {
          const $a = $(a);
          if ($a.is("i")) {
            return {
              name: $a.attr("data-original-title") || $a.attr("class")!.split("-")[1],
              icon: $a.attr("class")!.split("-")[1],
            };
          } else if ($a.is("img")) {
            const src = $a.attr("src")!;
            const iconName = src.split("/").pop()!.split(".")[0].split("-")[1];
            if (src.endsWith("aok-logo.png")) return { icon: "aok", name: "AOK Healthy through the week" };
            if (src.endsWith("bio-siegel.png")) return { icon: "bio", name: "Bio" };
            if (src.endsWith("icon_mensavital.png")) return { icon: "mensavital", name: "MensaVital" };
            return { icon: iconName, name: iconName === "karotte" ? "vegan" : iconName };
          } else if ($a.is("span.icon__not-veggie")) {
            return { name: $a.attr("data-original-title"), icon: "not-veggie" };
          }
          return null;
        })
        .get();

      return {
        name: mealName,
        supplements: supplements.slice(1, -1).split(", ").filter(Boolean),
        prices,
        icons,
      };
    })
    .get();
};
