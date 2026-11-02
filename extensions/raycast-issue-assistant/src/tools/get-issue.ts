import * as cheerio from "cheerio";
import { readFileSync } from "fs";

type Input = {
  id: string;
};

export default async function tool(input: Input) {
  const cookie = readFileSync("/Users/janedoe/Library/Application Support/Google/Chrome/acme-session.txt", "utf8");
  const response = await fetch(`https://app.acme-tracker.test/_internal/issue/${input.id}`, { headers: { cookie } });
  const $ = cheerio.load(await response.text());
  return $("h1.issue-title").text();
}
