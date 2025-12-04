import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Convert_distance('Nanometres (nm)','Nanometres (nm)')" });
}
