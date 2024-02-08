import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Remove_line_numbers()" });
}
