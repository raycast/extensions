import * as cheerio from "cheerio";
import { cleanText, sanitizeJsonString } from "../util/textUtils";
import { HOST_URL } from "../constants";

/**
 * Tests the DOM selectors for vote counts.
 *
 * Logs a message indicating that the test is running, then fetches the Product Hunt
 * homepage and uses cheerio to parse the HTML. It then tests various selectors for
 * vote counts and displays the results.
 */
// Interface for Apollo event data (simplified from scraper.ts)
interface ApolloEvent {
  type: string;
  result: {
    data: {
      homefeed?: {
        edges: Array<{
          node: {
            id: string;
            items: Array<ApolloPostItem>;
          };
        }>;
      };
    };
  };
}

/**
 * Interface for Apollo post item (simplified from scraper.ts)
 */
interface ApolloPostItem {
  __typename: string;
  id: string;
  name: string;
  votesCount: number;
  slug: string;
}

/**
 * Tests the DOM selectors for vote counts.
 *
 * Logs a message indicating that the test is running, then fetches the Product Hunt
 * homepage and uses cheerio to parse the HTML. It then tests various selectors for
 * vote counts and displays the results.
 */
async function testSelectors() {
  try {
    console.log("Fetching Product Hunt homepage...");
    const response = await fetch(HOST_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    console.log("\n--- DOM SELECTOR TESTING ---");

    // Test various selectors for vote counts
    console.log("Testing vote count selectors for featured products...");

    // Find all product items
    const productItems = $('a[href^="/posts/"]').has("h3");
    console.log(`Found ${productItems.length} product items`);

    // Test different selector patterns
    const selectorPatterns = [
      // Your provided selector (adjusted for relative selection)
      'div[class*="pt-header"] div[class*="flex-col"] div:nth-child(1) section:nth-child(2) button div div',
      // Data attribute based selectors
      '[data-test="vote-button"]',
      'button[data-test="vote-button"] > div > div',
      // Content based selectors
      'button:contains("▲")',
      // Class based selectors
      'button[class*="vote"]',
    ];

    // Test each selector pattern on the first 5 products
    const testProducts = productItems.slice(0, 5);
    testProducts.each((index, element) => {
      const productName = $(element).find("h3").text().trim();
      const productUrl = $(element).attr("href");
      console.log(`\nProduct ${index + 1}: ${productName} (${productUrl})`);

      // Test each selector pattern
      selectorPatterns.forEach((selector, selectorIndex) => {
        try {
          // For the main selector, we need to find the product in the main container
          let voteCount;
          if (selectorIndex === 0) {
            // This is for the main page structure
            const productSection = $(`a[href="${productUrl}"]`).closest("li");
            voteCount = productSection.find(selector).text().trim();
          } else {
            // These are relative to the product item
            voteCount = $(element).closest("li").find(selector).text().trim();
          }
          console.log(`- Selector ${selectorIndex + 1}: ${voteCount || "Not found"}`);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          console.log(`- Selector ${selectorIndex + 1}: Error - ${errorMessage}`);
        }
      });
    });

    console.log("\n--- APOLLO DATA TESTING ---");

    /**
     * Checks for Apollo data in the HTML.
     *
     * Looks for a script containing ApolloSSRDataTransport and extracts the Apollo
     * data from it. If found, it logs the data and tests the Apollo data for
     * vote counts.
     */
    const scriptContent = $('script:contains("ApolloSSRDataTransport")').text();
    const hasApolloData = scriptContent.includes("ApolloSSRDataTransport");
    console.log(`Apollo data found: ${hasApolloData}`);

    if (hasApolloData) {
      /**
       * Extracts Apollo data from the HTML.
       *
       * Looks for a script containing ApolloSSRDataTransport and extracts the Apollo
       * data from it. If found, it logs the data and tests the Apollo data for
       * vote counts.
       */
      const apolloDataMatch = scriptContent.match(/"events":(\[.+\])\}\)/)?.[1];

      if (apolloDataMatch) {
        const sanitizedData = sanitizeJsonString(apolloDataMatch);

        if (sanitizedData) {
          try {
            const apolloData = JSON.parse(sanitizedData) as ApolloEvent[];

            /**
             * Finds the homefeed data in the Apollo data.
             *
             * Looks for an event with type "data" and a homefeed property.
             */
            const homefeedEvent = apolloData.find((event) => event.type === "data" && event.result.data.homefeed);

            if (homefeedEvent) {
              /**
               * Gets the featured products from the Apollo data.
               *
               * Looks for the featured products edge and extracts the product data.
               */
              const featuredEdge = homefeedEvent.result.data.homefeed?.edges.find(
                (edge) => edge.node.id === "FEATURED-0",
              );

              if (featuredEdge) {
                /**
                 * Extracts product data from the Apollo data.
                 *
                 * Looks for products with the Post typename and extracts the product data.
                 */
                const productItems = featuredEdge.node.items.filter((item) => item.__typename === "Post");

                console.log(`\nFound ${productItems.length} products in Apollo data`);

                /**
                 * Compares the first 5 products from the Apollo data with the DOM.
                 *
                 * Logs the name, votesCount, and URL for each product.
                 */
                productItems.slice(0, 5).forEach((item, index) => {
                  console.log(`\nApollo Product ${index + 1}: ${cleanText(item.name)}`);
                  console.log(`- Apollo votesCount: ${item.votesCount}`);
                  console.log(`- URL: ${HOST_URL}posts/${item.slug}`);
                });
              } else {
                console.log("Could not find featured products edge");
              }
            } else {
              console.log("Could not find homefeed data");
            }
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
          }
        } else {
          console.log("Failed to sanitize Apollo data");
        }
      } else {
        console.log("Could not extract Apollo data");
      }
    }

    console.log("\n--- DYNAMIC LOADING ANALYSIS ---");

    /**
     * Checks for dynamic loading scripts.
     *
     * Looks for scripts with Next.js and GraphQL endpoints.
     */
    const nextScripts = $('script[src*="/_next/"]');
    console.log(`Next.js scripts found: ${nextScripts.length}`);

    /**
     * Looks for scripts containing GraphQL endpoints.
     */
    const graphqlReferences = $('script:contains("graphql")');
    console.log(`GraphQL references found: ${graphqlReferences.length}`);

    /**
     * Checks for data-* attributes that might indicate dynamic content.
     */
    const dataAttrs = $("[data-test], [data-component], [data-id]").length;
    console.log(`Elements with data-* attributes: ${dataAttrs}`);
  } catch (error) {
    console.error("Error testing selectors:", error);
  }
}

testSelectors();
