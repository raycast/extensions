import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Diff('\\n\\n','Character',true,true,false,false)" });
}
