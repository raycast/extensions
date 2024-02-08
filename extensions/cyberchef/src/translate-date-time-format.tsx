import { runCyberchefRecipe } from "./utils";
export default async function Command() {
  runCyberchefRecipe({
    recipe:
      "Translate_DateTime_Format('Standard date and time','DD/MM/YYYY HH:mm:ss','UTC','dddd Do MMMM YYYY HH:mm:ss Z z','UTC')",
  });
}
