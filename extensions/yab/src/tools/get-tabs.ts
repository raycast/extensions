import { readWindow } from "../yab";

type Input = {
  /** Only this space's tabs: its id from get-spaces. Leave out for every space. */
  spaceId?: string;
};

/** Every open tab of Yab's front window: id, title, url, location (topApp pin, pinned kept, unpinned today's), its space, and which is in front. */
export default async function tool(input: Input) {
  const window = await readWindow();
  const tabs = window?.tabs ?? [];
  return input.spaceId ? tabs.filter((t) => t.spaceId === input.spaceId) : tabs;
}
