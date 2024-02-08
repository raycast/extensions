import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "JavaScript_Beautify('\\t','Auto',true,true)" });
}
