import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Extract_file_paths(true,true,false,false,false)" });
}
