import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "To_UNIX_Timestamp('Seconds (s)',true,true)" });
}
