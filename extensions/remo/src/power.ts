import { power, run } from "./roku";

export default async function Command() {
  let on = false;
  await run("TV Power", async () => {
    on = await power();
  });
  return on;
}
