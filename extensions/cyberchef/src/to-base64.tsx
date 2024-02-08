import { runCyberchefRecipe } from "./utils";

export default async function Command() {
  await runCyberchefRecipe({ recipe: "To_Base64('A-Za-z0-9+/=')" });
}
