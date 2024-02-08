import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Sort('Line feed',false,'Alphabetical (case sensitive)')" });
}
