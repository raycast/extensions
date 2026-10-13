import { Action, ActionPanel, Color, Detail, Icon, LaunchProps, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AbrirProgresso, AbrirVocabulario } from "./componentes/navegacao";
import { garantirRegistro, marcarPulada, montarFila, promover } from "./nucleo/agenda";
import { markdownDaDigitacao, markdownDoVerbete, textoParaCopiar } from "./nucleo/apresentacao";
import { acrescentarSessao, gravarProgresso, gravarRecordes, lerProgresso, lerRecordes } from "./nucleo/armazenamento";
import { ATALHOS } from "./nucleo/atalhos";
import { corDaPrecisao, duracao, lerPreferencias, percentual, ppmTexto, tamanhoDaSessao } from "./nucleo/formato";
import { verbetesDoNivel } from "./nucleo/lexico";
import { Cronometro, atualizarRecordes, calcularPpm, calcularPrecisao } from "./nucleo/metricas";
import { alvoDaEtapa, caracteresDoVerbete, processarTecla, proximoIndice } from "./nucleo/sessao";
import { EstadoPedaco, aceitar, estadoDoPedaco, fatiar } from "./nucleo/texto";
import { ETAPAS_DO_MODO, Progresso, Recordes, ResultadoPalavra, Sessao, Verbete } from "./nucleo/tipos";

interface Recusa {
  digitou: string;
  esperava: string | undefined;
}

interface Resumo {
  sessao: Sessao;
  recordes: Recordes;
  resultados: ResultadoPalavra[];
}

export default function Praticar(props: LaunchProps<{ launchContext?: { palavra?: string } }>) {
  const preferencias = lerPreferencias();
  const { exigirAcento, exigirCaixa, modo, nivel, revisaoEspacada } = preferencias;
  const quantidadePedida = tamanhoDaSessao(preferencias);
  const palavraFixada = props.launchContext?.palavra;

  const opcoes = useMemo(() => ({ exigirAcento, exigirCaixa }), [exigirAcento, exigirCaixa]);
  const etapas = useMemo(() => ETAPAS_DO_MODO[modo] ?? ETAPAS_DO_MODO.completo, [modo]);

  const [fila, setFila] = useState<Verbete[]>([]);
  const [indice, setIndice] = useState(0);
  const [etapaIndice, setEtapaIndice] = useState(0);
  const [digitado, setDigitado] = useState("");
  const [recusa, setRecusa] = useState<Recusa | null>(null);
  const [resultados, setResultados] = useState(new Map<number, ResultadoPalavra>());
  const [carregando, setCarregando] = useState(true);
  const [resumo, setResumo] = useState<Resumo | null>(null);

  // Refs porque a decisão de aceitar ou recusar a tecla acontece dentro do
  // handler, onde o estado do React ainda é o do render anterior. Ler estado
  // ali erraria a etapa por um caractere, sempre.
  const resultadosRef = useRef(new Map<number, ResultadoPalavra>());
  const recusasDoVerbeteRef = useRef(0);
  const cronoSessaoRef = useRef(new Cronometro());
  const cronoVerbeteRef = useRef(new Cronometro());
  const progressoRef = useRef<Progresso>({});
  const filaRef = useRef<Verbete[]>([]);
  const indiceRef = useRef(0);
  const etapaIndiceRef = useRef(0);
  const alternaMarcaRef = useRef(false);

  const iniciar = useCallback(async () => {
    setCarregando(true);
    const progresso = await lerProgresso();
    progressoRef.current = progresso;

    const disponiveis = verbetesDoNivel(nivel);
    const quantidade = Math.min(quantidadePedida, disponiveis.length);
    let nova = montarFila(disponiveis, progresso, { quantidade, revisaoEspacada, agora: Date.now() });

    if (palavraFixada) {
      const alvo = disponiveis.find((v) => v.palavra === palavraFixada);
      if (alvo) nova = [alvo, ...nova.filter((v) => v.palavra !== alvo.palavra)].slice(0, Math.max(1, quantidade));
    }

    resultadosRef.current = new Map();
    recusasDoVerbeteRef.current = 0;
    cronoSessaoRef.current.zerar();
    cronoVerbeteRef.current.zerar();
    filaRef.current = nova;
    indiceRef.current = 0;
    etapaIndiceRef.current = 0;

    setFila(nova);
    setIndice(0);
    setEtapaIndice(0);
    setDigitado("");
    setRecusa(null);
    setResultados(new Map());
    setResumo(null);
    setCarregando(false);
  }, [nivel, quantidadePedida, revisaoEspacada, palavraFixada]);

  // A sessão é montada uma vez por abertura do comando. Sem esta trava, mudar
  // uma preferência recriaria `iniciar` e trocaria as palavras debaixo dos
  // dedos de quem está digitando.
  const jaMontou = useRef(false);
  useEffect(() => {
    if (jaMontou.current) return;
    jaMontou.current = true;
    iniciar().catch(async (erro) => {
      setCarregando(false);
      await showToast({ style: Toast.Style.Failure, title: "Não deu para montar a sessão", message: texto(erro) });
    });
  }, [iniciar]);

  const escrever = useCallback((valor: string) => setDigitado(valor), []);

  const irPara = useCallback(
    (destino: number) => {
      indiceRef.current = destino;
      etapaIndiceRef.current = 0;
      recusasDoVerbeteRef.current = 0;
      cronoVerbeteRef.current.zerar();
      setIndice(destino);
      setEtapaIndice(0);
      setRecusa(null);
      escrever("");
    },
    [escrever],
  );

  const encerrar = useCallback(async () => {
    const concluidos = [...resultadosRef.current.values()];
    const contados = concluidos.filter((r) => !r.pulada);
    const caracteres = contados.reduce((s, r) => s + r.caracteres, 0);
    const deslizes = contados.reduce((s, r) => s + r.deslizes, 0);
    const segundos = cronoSessaoRef.current.segundos();

    const sessao: Sessao = {
      em: Date.now(),
      palavras: contados.length,
      caracteres,
      deslizes,
      ppm: calcularPpm(caracteres, segundos),
      precisao: calcularPrecisao(caracteres, deslizes),
      segundos,
    };

    let recordes = await lerRecordes();
    if (sessao.palavras > 0) {
      recordes = atualizarRecordes(recordes, sessao);
      await acrescentarSessao(sessao);
      await gravarRecordes(recordes);
    }

    setResumo({ sessao, recordes, resultados: concluidos });
  }, []);

  const avancar = useCallback(() => {
    const destino = proximoIndice(indiceRef.current, filaRef.current.length, new Set(resultadosRef.current.keys()));
    if (destino !== null) {
      irPara(destino);
      return;
    }
    encerrar().catch(async (erro) => {
      await showToast({
        style: Toast.Style.Failure,
        title: "A sessão terminou, mas o registro falhou",
        message: texto(erro),
      });
    });
  }, [irPara, encerrar]);

  const registrar = useCallback(
    async (pulada: boolean) => {
      const posicao = indiceRef.current;
      const verbete = filaRef.current[posicao];
      if (!verbete) return;

      const deslizes = recusasDoVerbeteRef.current;
      const caracteres = caracteresDoVerbete(verbete, etapas);
      const segundos = cronoVerbeteRef.current.segundos();

      resultadosRef.current.set(posicao, { palavra: verbete.palavra, caracteres, deslizes, segundos, pulada });
      setResultados(new Map(resultadosRef.current));

      const agora = Date.now();
      const anterior = garantirRegistro(progressoRef.current, verbete.palavra);
      const atualizado = pulada ? marcarPulada(anterior, agora) : promover(anterior, deslizes, agora);
      const ppmDoVerbete = pulada ? 0 : calcularPpm(caracteres, segundos);

      progressoRef.current = {
        ...progressoRef.current,
        [verbete.palavra]: { ...atualizado, melhorPpm: Math.max(atualizado.melhorPpm, ppmDoVerbete) },
      };

      // Grava a cada palavra: fechar o Raycast no meio da sessão não pode
      // apagar o que já foi praticado.
      await gravarProgresso(progressoRef.current);
    },
    [etapas],
  );

  const concluirVerbete = useCallback(
    (pulada: boolean) => {
      registrar(pulada)
        .then(avancar)
        .catch(async (erro) => {
          await showToast({
            style: Toast.Style.Failure,
            title: "Não deu para gravar o progresso",
            message: texto(erro),
          });
          avancar();
        });
    },
    [registrar, avancar],
  );

  const aoDigitar = useCallback(
    (bruto: string) => {
      if (resumo) return;
      const verbete = filaRef.current[indiceRef.current];
      const etapa = etapas[etapaIndiceRef.current];
      if (!verbete || !etapa) return;

      const agora = Date.now();
      cronoSessaoRef.current.tocar(agora);
      cronoVerbeteRef.current.tocar(agora);

      const passo = processarTecla({
        bruto,
        alvo: alvoDaEtapa(verbete, etapa),
        opcoes,
        etapaIndice: etapaIndiceRef.current,
        totalEtapas: etapas.length,
        marcaLigada: alternaMarcaRef.current,
      });

      switch (passo.tipo) {
        case "recusa":
          recusasDoVerbeteRef.current += 1;
          alternaMarcaRef.current = passo.marcaLigada;
          setRecusa({ digitou: passo.recusado, esperava: passo.esperado });
          escrever(passo.campo);
          return;

        case "segue":
          setRecusa(null);
          escrever(passo.campo);
          return;

        case "etapa-vencida":
          setRecusa(null);
          etapaIndiceRef.current = passo.etapaIndice;
          setEtapaIndice(passo.etapaIndice);
          escrever("");
          return;

        case "verbete-vencido":
          setRecusa(null);
          escrever("");
          concluirVerbete(false);
          return;
      }
    },
    [resumo, opcoes, etapas, escrever, concluirVerbete],
  );

  const aoSelecionar = useCallback(
    (id: string | null) => {
      if (id === null) return;
      const destino = Number(id);
      if (!Number.isInteger(destino) || destino === indiceRef.current) return;
      irPara(destino);
    },
    [irPara],
  );

  const recomecarEtapa = useCallback(() => {
    setRecusa(null);
    escrever("");
  }, [escrever]);

  if (resumo) {
    return <TelaDeResumo resumo={resumo} etapas={etapas.length} aoRecomecar={() => void iniciar()} />;
  }

  const verbeteAtual = fila[indice];
  const etapaAtual = etapas[etapaIndice] ?? "palavra";
  const alvo = verbeteAtual ? alvoDaEtapa(verbeteAtual, etapaAtual) : "";
  const estado = aceitar(alvo, digitado, opcoes);

  const contados = [...resultados.values()].filter((r) => !r.pulada);
  const caracteresFeitos = contados.reduce((s, r) => s + r.caracteres, 0);
  const deslizesFeitos = contados.reduce((s, r) => s + r.deslizes, 0);
  const ppmParcial = calcularPpm(caracteresFeitos, cronoSessaoRef.current.segundos());
  const precisaoParcial = calcularPrecisao(caracteresFeitos, deslizesFeitos);

  return (
    <List
      isLoading={carregando}
      isShowingDetail
      filtering={false}
      searchText={digitado}
      onSearchTextChange={aoDigitar}
      searchBarPlaceholder="Digite aqui — o texto grande é que manda"
      selectedItemId={String(indice)}
      onSelectionChange={aoSelecionar}
      navigationTitle={
        fila.length > 0 ? `${indice + 1}/${fila.length}  ·  etapa ${etapaIndice + 1} de ${etapas.length}` : "Praticar"
      }
    >
      <List.EmptyView
        icon={Icon.Keyboard}
        title="Nenhuma palavra neste nível"
        description="Troque o nível do vocabulário nas preferências da extensão."
      />
      <List.Section
        title="Sessão"
        subtitle={
          resultados.size > 0
            ? `${resultados.size}/${fila.length}  ·  ${ppmTexto(ppmParcial)}  ·  ${percentual(precisaoParcial)}`
            : `${fila.length} palavras  ·  ${etapas.length} ${etapas.length === 1 ? "etapa" : "etapas"} cada`
        }
      >
        {fila.map((verbete, i) => {
          const resultado = resultados.get(i);
          const ativo = i === indice;
          return (
            <List.Item
              key={String(i)}
              id={String(i)}
              icon={iconeDaFila(resultado, ativo)}
              title={verbete.palavra}
              subtitle={ativo ? pontosDeEtapa(etapaIndice, etapas.length) : undefined}
              detail={
                <List.Item.Detail
                  markdown={
                    ativo
                      ? markdownDaDigitacao({
                          verbete,
                          etapa: etapaAtual,
                          etapasDoModo: etapas,
                          alvo,
                          posicao: estado.posicao,
                          palavraNumero: i + 1,
                          totalPalavras: fila.length,
                        })
                      : markdownDoVerbete(verbete)
                  }
                  metadata={
                    ativo ? (
                      <PainelAoVivo
                        alvo={alvo}
                        posicao={estado.posicao}
                        recusa={recusa}
                        deslizesDoVerbete={recusasDoVerbeteRef.current}
                        ppmParcial={ppmParcial}
                        precisaoParcial={precisaoParcial}
                      />
                    ) : (
                      <PainelDaFila resultado={resultado} />
                    )
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Recomeçar esta etapa" icon={Icon.Undo} onAction={recomecarEtapa} />
                    <Action
                      title="Pular esta palavra"
                      icon={Icon.Forward}
                      shortcut={ATALHOS.pular}
                      onAction={() => concluirVerbete(true)}
                    />
                    <Action
                      title="Encerrar e ver o resumo"
                      icon={Icon.Checkmark}
                      shortcut={ATALHOS.encerrar}
                      onAction={() => void encerrar()}
                    />
                    <Action
                      title="Nova sessão"
                      icon={Icon.ArrowClockwise}
                      shortcut={ATALHOS.novaSessao}
                      onAction={() => void iniciar()}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title={verbete.palavra}>
                    <Action.CopyToClipboard
                      title="Copiar a palavra"
                      content={verbete.palavra}
                      shortcut={ATALHOS.copiarPalavra}
                    />
                    <Action.CopyToClipboard
                      title="Copiar o verbete inteiro"
                      content={textoParaCopiar(verbete)}
                      shortcut={ATALHOS.copiarVerbete}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <AbrirVocabulario />
                    <AbrirProgresso />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function texto(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

function pontosDeEtapa(indice: number, total: number): string {
  return "●".repeat(indice + 1) + "○".repeat(Math.max(0, total - indice - 1));
}

function nomeDaTecla(caractere: string | undefined): string {
  if (caractere === undefined) return "fim";
  if (caractere === " ") return "espaço";
  return `«${caractere}»`;
}

function iconeDaFila(resultado: ResultadoPalavra | undefined, ativo: boolean) {
  if (resultado?.pulada) return { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
  if (resultado) {
    return { source: Icon.CheckCircle, tintColor: resultado.deslizes === 0 ? Color.Green : Color.Yellow };
  }
  if (ativo) return { source: Icon.CircleFilled, tintColor: Color.Orange };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

const COR_DO_PEDACO: Record<EstadoPedaco, Color> = {
  certo: Color.Green,
  errado: Color.Red,
  atual: Color.Orange,
  pendente: Color.SecondaryText,
};

function PainelAoVivo(props: {
  alvo: string;
  posicao: number;
  recusa: Recusa | null;
  deslizesDoVerbete: number;
  ppmParcial: number;
  precisaoParcial: number;
}) {
  const { alvo, posicao, recusa, deslizesDoVerbete, ppmParcial, precisaoParcial } = props;
  const pedacos = fatiar(alvo);

  return (
    <List.Item.Detail.Metadata>
      {recusa ? (
        <List.Item.Detail.Metadata.Label
          title="Tecla recusada"
          text={`${nomeDaTecla(recusa.digitou)} não entra — a próxima é ${nomeDaTecla(recusa.esperava)}`}
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
        />
      ) : (
        <List.Item.Detail.Metadata.Label
          title="Próxima"
          text={nomeDaTecla(Array.from(alvo)[posicao])}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        />
      )}
      {pedacos.length > 0 ? (
        <List.Item.Detail.Metadata.TagList title="Aprovado">
          {pedacos.map((pedaco) => (
            <List.Item.Detail.Metadata.TagList.Item
              key={pedaco.inicio}
              text={pedaco.texto}
              color={COR_DO_PEDACO[estadoDoPedaco(pedaco, posicao, recusa !== null)]}
            />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Teclas recusadas nesta palavra"
        text={String(deslizesDoVerbete)}
        icon={{
          source: deslizesDoVerbete === 0 ? Icon.Checkmark : Icon.Warning,
          tintColor: deslizesDoVerbete === 0 ? Color.Green : Color.Yellow,
        }}
      />
      <List.Item.Detail.Metadata.Label title="Velocidade na sessão" text={ppmTexto(ppmParcial)} icon={Icon.Bolt} />
      <List.Item.Detail.Metadata.Label
        title="Precisão na sessão"
        text={percentual(precisaoParcial)}
        icon={{ source: Icon.Gauge, tintColor: corDaPrecisao(precisaoParcial) }}
      />
    </List.Item.Detail.Metadata>
  );
}

function PainelDaFila({ resultado }: { resultado: ResultadoPalavra | undefined }) {
  if (!resultado) {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Ainda não praticada nesta sessão" text="—" icon={Icon.Circle} />
      </List.Item.Detail.Metadata>
    );
  }

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Nesta sessão"
        text={resultado.pulada ? "pulada" : `${resultado.deslizes} ${resultado.deslizes === 1 ? "recusa" : "recusas"}`}
        icon={resultado.pulada ? Icon.Forward : resultado.deslizes === 0 ? Icon.Checkmark : Icon.Warning}
      />
      {resultado.pulada ? null : (
        <List.Item.Detail.Metadata.Label title="Tempo" text={duracao(resultado.segundos)} icon={Icon.Stopwatch} />
      )}
    </List.Item.Detail.Metadata>
  );
}

function TelaDeResumo({ resumo, etapas, aoRecomecar }: { resumo: Resumo; etapas: number; aoRecomecar: () => void }) {
  const { sessao, recordes, resultados } = resumo;
  const tropecos = resultados
    .filter((r) => !r.pulada && r.deslizes > 0)
    .sort((a, b) => b.deslizes - a.deslizes)
    .slice(0, 8);
  const puladas = resultados.filter((r) => r.pulada);
  const limpas = resultados.filter((r) => !r.pulada && r.deslizes === 0).length;

  const linhas = [
    `# ${sessao.palavras} ${sessao.palavras === 1 ? "palavra" : "palavras"}`,
    "",
    `**${ppmTexto(sessao.ppm)}**  ·  precisão ${percentual(sessao.precisao)}  ·  ${duracao(sessao.segundos)}  ·  ${sessao.caracteres} caracteres em ${etapas} ${etapas === 1 ? "etapa" : "etapas"} por palavra`,
    "",
    "---",
    "",
  ];

  if (tropecos.length > 0) {
    linhas.push("### Onde o dedo travou", "");
    for (const t of tropecos) {
      linhas.push(`- **${t.palavra}** — ${t.deslizes} ${t.deslizes === 1 ? "tecla recusada" : "teclas recusadas"}`);
    }
    linhas.push("", `Saíram sem uma recusa: ${limpas}.`);
  } else if (sessao.palavras > 0) {
    linhas.push("### Sessão limpa", "", "Nenhuma tecla recusada. Vale subir o nível do vocabulário nas preferências.");
  } else {
    linhas.push("### Nada praticado", "", "A sessão foi encerrada antes da primeira palavra.");
  }

  if (puladas.length > 0) {
    linhas.push("", `Puladas: ${puladas.map((p) => p.palavra).join(", ")}.`);
  }

  return (
    <Detail
      navigationTitle="Sessão concluída"
      markdown={linhas.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Velocidade" text={ppmTexto(sessao.ppm)} icon={Icon.Bolt} />
          <Detail.Metadata.Label
            title="Precisão"
            text={percentual(sessao.precisao)}
            icon={{ source: Icon.Gauge, tintColor: corDaPrecisao(sessao.precisao) }}
          />
          <Detail.Metadata.Label title="Tempo digitando" text={duracao(sessao.segundos)} icon={Icon.Stopwatch} />
          <Detail.Metadata.Label title="Caracteres" text={String(sessao.caracteres)} icon={Icon.Text} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Sequência de dias"
            text={`${recordes.sequenciaDias} (recorde ${recordes.melhorSequenciaDias})`}
            icon={{ source: Icon.Trophy, tintColor: Color.Orange }}
          />
          <Detail.Metadata.Label title="Melhor velocidade" text={ppmTexto(recordes.melhorPpm)} icon={Icon.Star} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Nova sessão" icon={Icon.ArrowClockwise} onAction={aoRecomecar} />
          <AbrirProgresso />
          <AbrirVocabulario />
        </ActionPanel>
      }
    />
  );
}
