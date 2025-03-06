import getCache from "../utils/getCache";
const cache = getCache();
const content = cache?.state?.documentPanels;

export default async function () {
  return content;
}
