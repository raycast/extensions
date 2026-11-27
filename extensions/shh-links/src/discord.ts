import { closeMainWindow, Clipboard, getFrontmostApplication, getSelectedText, PopToRootType } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Stable, Public Test Build and Canary: whichever is open gets the paste
const DISCORDS = [
  { bundleId: "com.hnc.Discord", process: "Discord" },
  { bundleId: "com.hnc.DiscordPTB", process: "Discord PTB" },
  { bundleId: "com.hnc.DiscordCanary", process: "Discord Canary" },
];
type Discord = (typeof DISCORDS)[number];

const run = promisify(execFile);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function discordInFront(): Promise<Discord | undefined> {
  const app = await getFrontmostApplication().catch(() => undefined);
  return DISCORDS.find((d) => d.bundleId === app?.bundleId);
}

// Only Discord's selection counts: text selected in a browser is never meant as a title
export async function discordSelection(): Promise<string> {
  if (!(await discordInFront())) return "";
  return getSelectedText().catch(() => "");
}

// pgrep, not `open`: opening a closed Discord would take the paste before it loaded
async function isRunning(discord: Discord): Promise<boolean> {
  try {
    await run("/usr/bin/pgrep", ["-x", discord.process]);
    return true;
  } catch {
    return false;
  }
}

// The Discord in front, or else the first one running
async function runningDiscord(): Promise<Discord | undefined> {
  const front = await discordInFront();
  if (front) return front;
  for (const discord of DISCORDS) if (await isRunning(discord)) return discord;
  return undefined;
}

async function bringToFront(discord: Discord): Promise<boolean> {
  await run("/usr/bin/open", ["-b", discord.bundleId]);
  for (let i = 0; i < 20; i++) {
    if ((await discordInFront())?.bundleId === discord.bundleId) return true;
    await sleep(50);
  }
  return false;
}

export type PasteResult = "pasted" | "closed" | "no focus";

// Pastes into the field Discord had focused (the message box, normally), replacing its
// selection, and never sends. Raycast's window stays open when Discord is closed, so a
// form can still show the error; otherwise it closes before the switch.
export async function pasteInDiscord(content: string): Promise<PasteResult> {
  const discord = await runningDiscord();
  if (!discord) return "closed";
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  if (!(await bringToFront(discord))) return "no focus";
  // Lets Discord give focus back to the field it had before the switch
  await sleep(100);
  // Another app may have come to the front meanwhile, and it would take the paste
  if ((await discordInFront())?.bundleId !== discord.bundleId) return "no focus";
  // { text }, not the bare string: given a string, Discord received only "<>"
  await Clipboard.paste({ text: content });
  return "pasted";
}
