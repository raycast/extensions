import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "To_Table(',','\\r\\n',false,'ASCII')" });
}
