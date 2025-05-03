import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Pseudo-Random_Number_Generator(32,'Hex')" });
}
