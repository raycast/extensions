import { executeScript } from "../utils/applescript";
import { Link } from "../utils/types";

export async function listLinks() {
  return await executeScript<Link[]>(`
const app = Application("GoodLinks");

const links = app.links().map((l) => {
  return {
    id: l.id(),
    url: l.url(),
    title: l.title(),
    tagNames: l.tagNames(),
    read: l.read(),
    starred: l.starred(),
  };
});

return links;

    `);
}
