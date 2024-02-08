import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Count_occurrences({'option':'Regex','string':''})" });
}
