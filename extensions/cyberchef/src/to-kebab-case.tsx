import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "To_Kebab_case(false)" });
}
