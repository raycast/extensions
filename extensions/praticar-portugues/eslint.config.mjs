import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    rules: {
      // A extensão é inteiramente em português, e Title Case não existe em
      // português: "Limpar E Repetir" está errado, "Limpar e repetir" está
      // certo. A regra assume interface em inglês — aqui ela erraria sempre.
      "@raycast/prefer-title-case": "off",
    },
  },
]);
