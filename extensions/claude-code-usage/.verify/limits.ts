import { readPlanLimits, sourceLabel, spendSummary } from "../src/lib/limits";
(async () => {
  for (const pass of [1, 2]) {
    const l = await readPlanLimits({ force: pass === 1 });
    console.log(`--- passagem ${pass} --- fonte=${l.source} (${sourceLabel(l)}) problema=${l.problem ?? "nenhum"}`);
    for (const w of l.windows)
      console.log(
        `  ${w.kind.padEnd(14)} ${String(w.percent).padStart(3)}%  ativo=${w.isActive}  reinicia=${w.resetsAt?.toLocaleString("pt-BR") ?? "—"}`,
      );
    if (l.spend)
      console.log(
        `  creditos: ${spendSummary(l.spend).subtitle} (${l.spend.percent}%) | ligados_na_conta=${l.spend.configuredOn} gastavel_agora=${l.spend.spendableNow}`,
      );
  }
})();
