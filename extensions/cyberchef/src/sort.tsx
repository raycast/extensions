import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Sort('Line feed',false,'Alphabetical (case sensitive)')" });
}
