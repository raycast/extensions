import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Remove_whitespace(true,true,true,true,true,false)" });
}
