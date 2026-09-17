import { getFolders } from "../api/applescript";

export default async function () {
  const output = await getFolders();
  return output
    .split("\n")
    .map((line) => line.split("|"))
    .filter(([account, folder]) => account && folder)
    .map(([account, folder]) => ({ account, folder }));
}
