import { runCyberchefRecipe } from "./utils/receipe-utils";
export default async function Command() {
  await runCyberchefRecipe({ recipe: "Generate_QR_Code('PNG',5,4,'Medium')" });
}
