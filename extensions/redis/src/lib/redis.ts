import fetch from "node-fetch";
import parse from "node-html-parser";

export const fetchRedisCommands = async (signal?: AbortSignal): Promise<RedisCommand[]> => {
  const resp = await fetch("https://redis.io/commands/", { signal });
  if (!resp.ok) {
    return Promise.reject(new Error(resp.statusText));
  }

  const text = await resp.text();
  const root = parse(text);

  const groupRoots = root.querySelectorAll("select#group-filter optgroup");
  const groups: { [key: string]: Group } = {};
  groupRoots.forEach((groupRoot) => {
    const label = groupRoot.getAttribute("label")?.trim();
    if (!label) {
      return;
    }
    const groupEls = groupRoot.querySelectorAll("option");
    groupEls.forEach((el) => {
      const name = el.text;
      const value = el.getAttribute("value");
      if (!value) {
        return;
      }
      groups[value] = { label, name };
    });
  });

  const commands = root.querySelectorAll("div#commands-grid article");

  const result: RedisCommand[] = [];
  commands.forEach((command) => {
    const style = command.getAttribute("style");
    if (style && style.includes("display: none;")) {
      return;
    }
    const name = command.querySelector("h1")?.text?.trim();
    if (!name) {
      return;
    }
    const description = command.querySelector("p")?.text?.trim();
    if (!description) {
      return;
    }
    const url = command.querySelector("a")?.getAttribute("href");
    if (!url) {
      return;
    }
    const groupKey = command.getAttribute("data-group");
    const group = groups[groupKey ?? ""];
    if (!group) {
      return;
    }
    result.push({
      name,
      description,
      group,
      url,
    });
  });
  return result;
};

export interface RedisCommand {
  name: string;
  description: string;
  group: Group;
  url: string;
}

export interface Group {
  label: string;
  name: string;
}
