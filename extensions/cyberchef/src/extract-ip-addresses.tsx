import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Extract_IP_addresses(true,false,false,false,false,false)" });
}
