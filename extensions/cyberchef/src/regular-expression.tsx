import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  runCyberchefRecipe({
    recipe: "Regular_expression('User defined','',true,true,false,false,false,false,'Highlight matches')",
  });
}
