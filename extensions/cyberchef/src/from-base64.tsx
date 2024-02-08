import { runCyberchefRecipe } from "./utils";

export default async function Command() {
  await runCyberchefRecipe({ recipe: "From_Base64('A-Za-z0-9+/=',true,false)" });
}
