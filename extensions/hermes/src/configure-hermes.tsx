/**
 * `Configurar Hermes` (UX-SPEC §2.8, que remete à §3 inteira).
 *
 * Existe porque a §3 é DUAS coisas: a tela de primeiro uso e o ponto de REPARO. Antes deste
 * comando ela só era alcançável pela guarda `isConfigured() === false` de outro comando, e
 * essa guarda só olha se EXISTE uma chave — não se ela funciona. Um usuário cuja chave foi
 * regerada pelo Hermes tinha a chave errada guardada, `isConfigured()` respondia `true`, e
 * `Detectar configuração automaticamente`, `Configurar manualmente`, `O que é isso?` e
 * `Esquecer a chave detectada` ficavam inalcançáveis a partir da busca do Raycast.
 *
 * Não há tela nova aqui: é literalmente `FirstRunScreen` (§3.4), sem a guarda. A §3 tem uma
 * implementação só, em `components/first-run.tsx` — a duplicação já foi removida uma vez e
 * não volta.
 */

import type { ReactElement } from "react";
import { FirstRunScreen } from "./components/first-run";

export default function Command(): ReactElement {
  // Sem `onDone`: aqui a tela É o destino, não um desvio no meio de outro comando. Depois
  // de detectar, `AutoDetectScreen` mostra o resultado e `Continuar` volta para cá.
  return <FirstRunScreen navigationTitle="Configure Hermes" />;
}
