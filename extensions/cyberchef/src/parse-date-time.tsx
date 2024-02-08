import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Parse_DateTime('Standard date and time','DD/MM/YYYY HH:mm:ss','UTC')" });
}
