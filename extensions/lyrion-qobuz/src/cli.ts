import { input, select } from "@inquirer/prompts";
import ora from "ora";
import { LyrionClient, type SearchItem } from "./lms.js";

async function drillDown(
  client: LyrionClient,
  query: string,
  items: SearchItem[],
  spinner: ReturnType<typeof ora>,
): Promise<void> {
  const choices = items.map((item) => ({
    name: item.name,
    value: item,
    description: "",
  }));
  choices.push({
    name: "🔙 Back",
    value: null as unknown as SearchItem,
    description: "",
  });

  const selected = await select({
    message: "Select an item:",
    choices,
    loop: false,
  });

  if (!selected) return;

  // If item has a playId → play it. Albums, tracks, playlists all have actions.play.
  if (selected.playId) {
    spinner.start("Starting playback...");
    const result = await client.play(selected.playId, query);
    if (result.success) spinner.succeed("Playback started!");
    else spinner.fail(result.error ?? "Playback failed");
    return;
  }

  // No playId → container (artist, category). Drill using goId.
  spinner.start("Loading...");
  const children = await client.getSubmenu(query, selected.goId, 30);
  spinner.stop();

  if (children.length > 0) {
    await drillDown(client, query, children, spinner);
    return;
  }

  console.log("No items found.");
}

// Configuration
const LMS_HOST = "192.168.0.21";
const LMS_PORT = 9000;
const PLAYER_ID = "00:00:00:00:00:10";

async function main() {
  console.log("🎵 Lyrion Qobuz CLI\n");

  const client = new LyrionClient(LMS_HOST, LMS_PORT, PLAYER_ID);

  while (true) {
    const query = await input({
      message: 'Search Qobuz (or type "exit" to quit):',
    });

    if (query.toLowerCase() === "exit") break;
    if (!query.trim()) continue;

    const spinner = ora("Searching...").start();
    try {
      const categories = await client.searchQobuz(query);
      spinner.stop();

      if (!categories.length) {
        console.log("No results found.");
        continue;
      }

      const catChoice = await select({
        message: "Select a category:",
        choices: [
          ...categories.map((cat) => ({
            name: cat.name,
            value: cat,
            description: "",
          })),
          {
            name: "🔙 Back to search",
            value: null as unknown as SearchItem,
            description: "",
          },
        ],
      });

      if (!catChoice) continue;

      spinner.start("Loading items...");
      const items = await client.getSubmenu(query, catChoice.goId, 20);
      spinner.stop();

      if (!items.length) {
        console.log("No items found in this category.");
        continue;
      }

      await drillDown(client, query, items, spinner);
    } catch (error: any) {
      spinner.stop();
      console.error("\n❌ Error:", error.message);
    }
  }

  console.log("Goodbye!");
}

main().catch(console.error);
