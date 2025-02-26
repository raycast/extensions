import { executeScript } from "../utils/applescript";

export async function saveLink(url: string) {
  await executeScript(`
const goodlinks = Application("GoodLinks");
goodlinks.make({
  new: "link",
  withProperties: {
    url: "${url}",
  },
});

return null
        `);
}
