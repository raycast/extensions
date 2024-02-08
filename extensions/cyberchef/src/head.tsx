import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Head('Line feed',10)" });
}
