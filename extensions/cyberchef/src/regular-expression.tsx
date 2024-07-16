import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  runCyberchefRecipe({
    recipe: "Regular_expression('User defined','',true,true,false,false,false,false,'Highlight matches')",
  });
}
