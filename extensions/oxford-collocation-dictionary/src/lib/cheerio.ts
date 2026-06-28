import * as cheerio from "cheerio";
import { randomUUID, UUID } from "crypto";

export interface Collocation {
  id: UUID;
  type: string;
  collocations: string[];
  definition?: string;
}

// CHAT GPT THING (I'm lazy)
export function parseHtml(data: string) {
  const result: { type: string; collocationGroup: Collocation[] }[] = [];
  // Initialize the result array
  const $ = cheerio.load(data);
  // Extract the items with class "item" inside the div with id "leftnav"
  $(".item").each((_, item) => {
    // Extract the type from the first "p" of the item which contains an "i" element
    const type = $(item).find("p").first().find("i").text().trim();

    // Initialize the collocations array for the current item
    const collocationsArray: Collocation[] = [];
    // Initialize a variable to hold the current definition
    let currentDefinition = "";

    // Loop through each paragraph inside the item
    $(item)
      .find("p")
      .each((_, p) => {
        const $p = $(p);

        // Check if the paragraph contains a "tt" element for definition
        if ($p.find("tt").length > 0) {
          currentDefinition = $p.find("tt").text().trim();
        }

        // Check if the first child of the paragraph is a "u" element
        if ($p.children().first().is("u")) {
          // Extract the text content of the "u" element
          const collocationType = $p.find("u").text().trim();

          // Extract the text content of all "b" elements within the same paragraph
          const collocations = $p
            .find("b")
            .map((_, b) => $(b).text().trim())
            .get();

          // Split the collocations text content by comma and pipe, then flatten the array and filter out empty strings
          const flatCollocations = collocations
            .flatMap((c) => c.split(",").flatMap((s) => s.split("|").map((str) => str.trim())))
            .filter((str) => str.length > 0);

          // Add the extracted data to the collocations array
          collocationsArray.push({
            id: randomUUID(),
            type: collocationType,
            definition: currentDefinition,
            collocations: flatCollocations,
          });
        }
      });

    // Add the extracted item with its collocations to the result array
    result.push({ type, collocationGroup: collocationsArray });
  });

  return result;
}
