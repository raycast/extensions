import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "JSON_Beautify('\\t','Auto',true,true)" });
}
