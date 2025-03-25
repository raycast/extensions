import * as cheerio from "cheerio";

export interface ApiTrain {
  carrier: string;
  category: string;
  number: string;
  destination: string;
  time: string;
  platform: string;
  delay: string;
  isBlinking: boolean;
  notes: string;
}

export function parseTrains(html: string): ApiTrain[] {
  const $ = cheerio.load(html);

  const trains: ApiTrain[] = [];

  $("tbody tr").each((i, elem) => {
    const cells = $("td", elem);

    const carrier = cells.eq(0).find("img").attr("alt");
    if (!carrier) {
      return;
    }

    const category = cells.eq(1).find("img").attr("alt") ?? "";
    const number = cells.eq(2).text().trim();
    const destination = cells.eq(3).text().trim();
    const time = cells.eq(4).text().trim();
    const delay = cells.eq(5).text().trim();
    const platform = cells.eq(6).text().trim();
    const isBlinking = cells.eq(7).find("img").length > 0;
    const notes = cells.eq(8).text().trim();

    trains.push({
      carrier,
      category,
      number,
      destination,
      time,
      platform,
      delay,
      isBlinking,
      notes,
    });
  });

  return trains;
}
