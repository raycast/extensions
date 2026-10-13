import { scanUsage, groupBy, emptyTotals, addEntry, totalTokens } from "../src/lib/scan";
import { readPlanLimits } from "../src/lib/limits";

(async () => {
  const t0 = Date.now();
  const r = await scanUsage();
  const ms = Date.now() - t0;
  const t = emptyTotals();
  for (const e of r.entries) addEntry(t, e);
  console.log(`arquivos=${r.filesScanned} relidos=${r.filesReparsed} entradas=${r.entries.length} tempo=${(ms/1000).toFixed(1)}s`);
  console.log(`tokens=${totalTokens(t).toLocaleString("pt-BR")} custo=$${t.cost.toFixed(2)} msgs=${t.messages}`);
  console.log("in/out/cw5/cw1/cr:", t.input, t.output, t.cacheWrite5m, t.cacheWrite1h, t.cacheRead);
  const byModel = [...groupBy(r.entries, e => e.model).entries()].sort((a,b)=>b[1].cost-a[1].cost);
  for (const [m, tt] of byModel) console.log(`  ${m}: ${totalTokens(tt).toLocaleString("pt-BR")} tk  $${tt.cost.toFixed(2)}`);
  const byProj = [...groupBy(r.entries, e => r.projectOf.get(e.key) ?? "?").entries()].sort((a,b)=>b[1].cost-a[1].cost).slice(0,6);
  console.log("top projetos:"); for (const [p, tt] of byProj) console.log(`  ${p}: $${tt.cost.toFixed(2)}`);
  const days = [...groupBy(r.entries, e => e.day).entries()].sort((a,b)=>b[0].localeCompare(a[0])).slice(0,4);
  console.log("ultimos dias:"); for (const [d, tt] of days) console.log(`  ${d}: ${totalTokens(tt).toLocaleString("pt-BR")} tk  $${tt.cost.toFixed(2)}`);
  const lim = await readPlanLimits();
  console.log("limites:", lim.windows.map(w => `${w.kind}=${w.percent}%`).join(" "), "| lido:", lim.fetchedAt?.toISOString());
})();
