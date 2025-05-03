import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Convert_area('Square metre (sq m)','Square metre (sq m)')" });
}
