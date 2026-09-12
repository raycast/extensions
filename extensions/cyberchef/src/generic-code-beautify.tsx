import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Generic_Code_Beautify()" });
}
