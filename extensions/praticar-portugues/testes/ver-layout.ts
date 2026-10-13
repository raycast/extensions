/**
 * Imprime o markdown exato que a extensão manda para o painel do Raycast, nas
 * três etapas. Serve para conferir o layout sem precisar olhar a janela.
 *   npm run layout
 */
import { markdownDaDigitacao } from "../src/nucleo/apresentacao";
import { ETAPAS_DO_MODO } from "../src/nucleo/tipos";
import type { Verbete } from "../src/nucleo/tipos";

const verbete: Verbete = {
  palavra: "efêmero",
  classe: "adjetivo",
  significado: "que dura muito pouco tempo",
  exemplo: "A fama viral é efêmera: some antes de virar memória.",
  nivel: 1,
};

const cenarios: { etapa: (typeof ETAPAS_DO_MODO.completo)[number]; alvo: string; posicao: number }[] = [
  { etapa: "palavra", alvo: verbete.palavra, posicao: 3 },
  { etapa: "significado", alvo: verbete.significado, posicao: 10 },
  { etapa: "exemplo", alvo: verbete.exemplo, posicao: 15 },
];

for (const c of cenarios) {
  console.log("\n" + "═".repeat(74));
  console.log(
    markdownDaDigitacao({
      verbete,
      etapa: c.etapa,
      etapasDoModo: ETAPAS_DO_MODO.completo,
      alvo: c.alvo,
      posicao: c.posicao,
      palavraNumero: 4,
      totalPalavras: 10,
    }),
  );
}
console.log("\n" + "═".repeat(74) + "\n");
