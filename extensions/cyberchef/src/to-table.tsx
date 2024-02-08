import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "To_Table(',','\\r\\n',false,'ASCII')" });
}
