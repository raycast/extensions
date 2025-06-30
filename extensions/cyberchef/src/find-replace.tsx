import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Find_/_Replace({'option':'Regex','string':''},'',true,false,true,false)" });
}
