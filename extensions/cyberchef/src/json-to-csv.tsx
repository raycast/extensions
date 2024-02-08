import { runCyberchefRecipe } from "./utils";

export default async function Command() {
  await runCyberchefRecipe({ recipe: "JSON_to_CSV(',','\\r\\n')" });
}
