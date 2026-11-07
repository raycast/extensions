/**
 * ESLint 9 (flat config). Sem este arquivo o `ray lint` sai com erro sem nunca
 * ter olhado uma linha de codigo — o portao ficava vermelho por ausencia de
 * configuracao, nao por defeito, e por isso ninguem olhava para ele.
 */
import { defineConfig } from "eslint/config";
import raycastConfig from "@raycast/eslint-config";

export default defineConfig([
  ...raycastConfig,
  {
    // Os scripts de verificacao rodam fora do Raycast, no Node puro.
    ignores: [".verify/out/**"],
  },
]);
