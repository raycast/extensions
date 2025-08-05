import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "From_UNIX_Timestamp('Seconds (s)')" });
}
