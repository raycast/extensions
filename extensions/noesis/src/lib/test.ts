import { fetchRemoteSnapshot } from "./api";

console.log("Testing Selemene API snapshot...\n");

(async () => {
  const baseUrl =
    process.env.NOESIS_API_BASE_URL ||
    process.env.SELEMENE_BASE_URL ||
    "https://selemene.tryambakam.space";
  const apiKey = process.env.NOESIS_API_KEY || process.env.SELEMENE_API_KEY;

  if (!apiKey) {
    console.error(
      "Missing NOESIS_API_KEY / SELEMENE_API_KEY for manual snapshot test.",
    );
    process.exit(1);
  }

  try {
    const snapshot = await fetchRemoteSnapshot(
      { baseUrl, apiKey },
      {
        includeCatalog: true,
        includeProfile: true,
        includeUsage: true,
        includeReadings: true,
      },
    );
    console.log("Snapshot successful.\n");
    console.log(JSON.stringify(snapshot, null, 2));
  } catch (error) {
    console.error("Error querying Selemene snapshot:");
    console.error(error);
    process.exit(1);
  }
})();
