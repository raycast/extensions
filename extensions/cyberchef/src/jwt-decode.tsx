import { runCyberchefRecipe } from "./utils";

export default async function Command() {
  await runCyberchefRecipe({ recipe: "JWT_Decode()" });
}
