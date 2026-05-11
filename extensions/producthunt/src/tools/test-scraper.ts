import { getFrontpageProducts } from "../api/scraper";

/**
 * Tests the improved scraper with leaderboard logging.
 *
 * Logs a message indicating that the test is running, then fetches the frontpage products
 * using the improved scraper. If an error occurs, it logs the error message. Otherwise,
 * it logs a success message with the number of products fetched, and displays a summary
 * of the products with their vote counts. If an unexpected error occurs, it logs that
 * as well.
 */
async function testScraper() {
  console.log("Testing the improved scraper with leaderboard logging...");

  try {
    const result = await getFrontpageProducts();

    if (result.error) {
      console.error("Error:", result.error);
    } else {
      console.log(`Successfully fetched ${result.products.length} products`);

      // Display a summary of the products and their vote counts
      console.log("\n--- PRODUCT SUMMARY ---");
      result.products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Points: ${product.votesCount}`);
        console.log(`   URL: ${product.url}`);
      });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

testScraper();
