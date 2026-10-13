import { Action, ActionPanel, Alert, Color, Detail, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { AbrirPratica, AbrirVocabulario } from "./componentes/navegacao";
import { estaDevida } from "./nucleo/agenda";
import { ATALHOS } from "./nucleo/atalhos";
import { lerProgresso, lerRecordes, lerSessoes, RECORDES_ZERADOS, zerarTudo } from "./nucleo/armazenamento";
import { barra, corDaPrecisao, diaCurto, duracao, medidorDeCaixa, percentual, ppmTexto } from "./nucleo/formato";
import { todosOsVerbetes } from "./nucleo/lexico";
import { agregar, porDia } from "./nucleo/metricas";
import { CAIXA_MAXIMA, Progresso, Recordes, Sessao } from "./nucleo/tipos";

interface Dados {
  progresso: Progresso;
  sessoes: Sessao[];
  recordes: Recordes;
  agora: number;
}

export default function MeuProgresso() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [progresso, sessoes, recordes] = await Promise.all([lerProgresso(), lerSessoes(), lerRecordes()]);
    setDados({ progresso, sessoes, recordes, agora: Date.now() });
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar().catch(async (erro) => {
      setCarregando(false);
      setDados({ progresso: {}, sessoes: [], recordes: RECORDES_ZERADOS, agora: Date.now() });
      await showToast({
        style: Toast.Style.Failure,
        title: "Não deu para ler o seu progresso",
        message: erro instanceof Error ? erro.message : String(erro),
      });
    });
  }, [carregar]);

  const zerar = useCallback(async () => {
    const confirmado = await confirmAlert({
      title: "Apagar todo o seu progresso?",
      message:
        "Some o histórico de cada palavra, todas as sessões e os recordes. O léxico continua intacto, mas o que você já praticou não volta.",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Apagar tudo", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancelar" },
    });
    if (!confirmado) return;
    await zerarTudo();
    await carregar();
    await showToast({ style: Toast.Style.Success, title: "Progresso apagado" });
  }, [carregar]);

  const relatorio = dados ? montarRelatorio(dados) : "";

  return (
    <Detail
      isLoading={carregando}
      navigationTitle="Meu Progresso"
      markdown={relatorio}
      metadata={dados ? <Painel dados={dados} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <AbrirPratica />
            <AbrirVocabulario />
            <Action
              title="Recarregar"
              icon={Icon.ArrowClockwise}
              shortcut={ATALHOS.recarregar}
              onAction={() => void carregar()}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copiar o relatório" content={relatorio} shortcut={ATALHOS.copiarRelatorio} />
            <Action
              title="Apagar todo o progresso"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={ATALHOS.zerarTudo}
              onAction={() => void zerar()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function contarCaixas(progresso: Progresso) {
  const total = todosOsVerbetes().length;
  const caixas = [0, 0, 0, 0, 0, 0];
  let tocadas = 0;
  for (const registro of Object.values(progresso)) {
    const c = Math.max(0, Math.min(CAIXA_MAXIMA, registro.caixa));
    caixas[c] = (caixas[c] ?? 0) + 1;
    if (registro.caixa > 0) tocadas++;
  }
  caixas[0] = total - tocadas;
  return { caixas, total, tocadas };
}

function montarRelatorio(dados: Dados): string {
  const { progresso, sessoes, recordes, agora } = dados;
  const geral = agregar(sessoes);
  const { caixas, total, tocadas } = contarCaixas(progresso);
  const dominadas = caixas[CAIXA_MAXIMA] ?? 0;

  if (sessoes.length === 0) {
    return [
      "# Nenhuma sessão ainda",
      "",
      `O léxico tem **${total} palavras** esperando. Abra *Praticar Digitação* e a primeira sessão já começa a alimentar esta tela.`,
      "",
      "---",
      "",
      "Aqui vão aparecer velocidade, precisão, sequência de dias e a lista das palavras que mais escapam de você.",
    ].join("\n");
  }

  const linhas: string[] = [
    `# ${percentual(tocadas / total)} do léxico`,
    "",
    `${tocadas} de ${total} palavras já passaram pelos seus dedos · **${dominadas} dominadas**`,
    "",
    "---",
    "",
    "### Últimos sete dias",
    "",
    "| Dia | Volume | Palavras | Velocidade | Precisão |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  const semana = porDia(sessoes, 7, agora);
  const pico = Math.max(1, ...semana.map((d) => d.palavras));
  for (const dia of semana) {
    const marca = dia.palavras > 0 ? `\`${barra(dia.palavras, pico, 10)}\`` : "`··········`";
    linhas.push(
      `| ${diaCurto(dia.dia)} | ${marca} | ${dia.palavras || "—"} | ${
        dia.palavras > 0 ? ppmTexto(dia.ppm) : "—"
      } | ${dia.palavras > 0 ? percentual(dia.precisao) : "—"} |`,
    );
  }

  const escorregam = Object.entries(progresso)
    .filter(([, r]) => r.tentativas > 0 && r.deslizesTotais > 0)
    .map(([palavra, r]) => ({ palavra, media: r.deslizesTotais / r.tentativas, caixa: r.caixa, registro: r }))
    .sort((a, b) => b.media - a.media || a.caixa - b.caixa)
    .slice(0, 10);

  linhas.push("", "### As que mais escapam", "");
  if (escorregam.length === 0) {
    linhas.push("Nenhuma palavra acumulou deslizes até agora.");
  } else {
    linhas.push("| Palavra | Deslizes por tentativa | Domínio |", "| --- | ---: | --- |");
    for (const item of escorregam) {
      linhas.push(`| **${item.palavra}** | ${item.media.toFixed(1)} | \`${medidorDeCaixa(item.caixa)}\` |`);
    }
  }

  const devidas = Object.entries(progresso).filter(([, r]) => estaDevida(r, agora)).length;
  const naFila = total - tocadas;

  linhas.push(
    "",
    "### Distribuição",
    "",
    "| Caixa | Palavras |",
    "| --- | ---: |",
    `| \`${medidorDeCaixa(0)}\` nunca praticadas | ${naFila} |`,
    `| \`${medidorDeCaixa(1)}\` escorregam | ${caixas[1] ?? 0} |`,
    `| \`${medidorDeCaixa(2)}\` aprendendo | ${caixas[2] ?? 0} |`,
    `| \`${medidorDeCaixa(3)}\` firmando | ${caixas[3] ?? 0} |`,
    `| \`${medidorDeCaixa(4)}\` quase lá | ${caixas[4] ?? 0} |`,
    `| \`${medidorDeCaixa(5)}\` dominadas | ${dominadas} |`,
    "",
    devidas > 0
      ? `**${devidas} ${devidas === 1 ? "palavra está" : "palavras estão"} pedindo revisão agora.**`
      : "Nenhuma palavra vencida: a próxima revisão ainda vai demorar.",
    "",
    "---",
    "",
    `${geral.sessoes} ${geral.sessoes === 1 ? "sessão" : "sessões"} · ${geral.caracteres} caracteres digitados · ${duracao(
      geral.segundos,
    )} de teclado · sequência de ${recordes.sequenciaDias} ${recordes.sequenciaDias === 1 ? "dia" : "dias"}`,
  );

  return linhas.join("\n");
}

function Painel({ dados }: { dados: Dados }) {
  const { sessoes, recordes, agora } = dados;
  const geral = agregar(sessoes);
  const ultimaSemana = agregar(sessoes.filter((s) => s.em >= agora - 7 * 86_400_000));

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Velocidade média"
        text={ppmTexto(geral.ppmMedio)}
        icon={{ source: Icon.Bolt, tintColor: Color.Orange }}
      />
      <Detail.Metadata.Label
        title="Precisão média"
        text={percentual(geral.precisaoMedia)}
        icon={{ source: Icon.Gauge, tintColor: corDaPrecisao(geral.precisaoMedia) }}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Nos últimos 7 dias"
        text={`${ultimaSemana.palavras} palavras`}
        icon={Icon.Calendar}
      />
      <Detail.Metadata.Label
        title="Velocidade na semana"
        text={ppmTexto(ultimaSemana.ppmMedio)}
        icon={Icon.LineChart}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Sequência de dias"
        text={`${recordes.sequenciaDias}`}
        icon={{ source: Icon.Flag, tintColor: Color.Orange }}
      />
      <Detail.Metadata.Label
        title="Melhor sequência"
        text={`${recordes.melhorSequenciaDias}`}
        icon={{ source: Icon.Trophy, tintColor: Color.Yellow }}
      />
      <Detail.Metadata.Label
        title="Recorde de velocidade"
        text={ppmTexto(recordes.melhorPpm)}
        icon={{ source: Icon.Star, tintColor: Color.Yellow }}
      />
      <Detail.Metadata.Label
        title="Recorde de precisão"
        text={recordes.melhorPrecisao > 0 ? percentual(recordes.melhorPrecisao) : "—"}
        icon={{ source: Icon.StarCircle, tintColor: Color.Green }}
      />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Tempo total de teclado" text={duracao(geral.segundos)} icon={Icon.Stopwatch} />
      <Detail.Metadata.Label title="Sessões registradas" text={String(geral.sessoes)} icon={Icon.List} />
    </Detail.Metadata>
  );
}
