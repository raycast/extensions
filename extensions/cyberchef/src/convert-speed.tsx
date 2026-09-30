import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Convert_speed('Metres per second (m/s)','Metres per second (m/s)')" });
}
