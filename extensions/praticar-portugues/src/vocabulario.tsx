import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AbrirPratica, AbrirProgresso } from "./componentes/navegacao";
import { estaDevida, proximaRevisaoEmTexto } from "./nucleo/agenda";
import { ATALHOS } from "./nucleo/atalhos";
import { markdownDoVerbete, textoParaCopiar } from "./nucleo/apresentacao";
import { gravarProgresso, lerProgresso } from "./nucleo/armazenamento";
import { corDaCaixa, duracao, medidorDeCaixa, ppmTexto, rotuloDeCaixa } from "./nucleo/formato";
import { ROTULO_NIVEL, todosOsVerbetes } from "./nucleo/lexico";
import { semAcento } from "./nucleo/texto";
import { CAIXA_MAXIMA, Progresso, RegistroPalavra, Verbete, registroVazio } from "./nucleo/tipos";

type Filtro = "todas" | "revisar" | "aprendendo" | "dominadas" | "novas" | "n1" | "n2" | "n3";

const GRUPOS: { chave: Exclude<Filtro, "todas" | "n1" | "n2" | "n3">; titulo: string }[] = [
  { chave: "revisar", titulo: "Para revisar agora" },
  { chave: "aprendendo", titulo: "Aprendendo" },
  { chave: "dominadas", titulo: "Dominadas" },
  { chave: "novas", titulo: "Ainda não praticadas" },
];

export default function Vocabulario() {
  const [progresso, setProgresso] = useState<Progresso>({});
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const agora = useMemo(() => Date.now(), []);
  const verbetes = useMemo(() => todosOsVerbetes(), []);

  useEffect(() => {
    lerProgresso()
      .then((p) => {
        setProgresso(p);
        setCarregando(false);
      })
      .catch(async (erro) => {
        setCarregando(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Não deu para ler o seu histórico",
          message: erro instanceof Error ? erro.message : String(erro),
        });
      });
  }, []);

  const salvar = useCallback(async (novo: Progresso) => {
    setProgresso(novo);
    await gravarProgresso(novo);
  }, []);

  const marcarDominada = useCallback(
    async (verbete: Verbete) => {
      const anterior = progresso[verbete.palavra] ?? registroVazio();
      await salvar({
        ...progresso,
        [verbete.palavra]: {
          ...anterior,
          caixa: CAIXA_MAXIMA,
          vistaEm: Date.now(),
          devidaEm: Date.now() + 21 * 24 * 60 * 60 * 1000,
        },
      });
      await showToast({ style: Toast.Style.Success, title: `"${verbete.palavra}" marcada como dominada` });
    },
    [progresso, salvar],
  );

  const esquecer = useCallback(
    async (verbete: Verbete) => {
      const novo = { ...progresso };
      delete novo[verbete.palavra];
      await salvar(novo);
      await showToast({ style: Toast.Style.Success, title: `Histórico de "${verbete.palavra}" apagado` });
    },
    [progresso, salvar],
  );

  const grupoDe = useCallback(
    (verbete: Verbete): Exclude<Filtro, "todas" | "n1" | "n2" | "n3"> => {
      const registro = progresso[verbete.palavra];
      if (!registro || registro.caixa === 0) return "novas";
      if (estaDevida(registro, agora)) return "revisar";
      if (registro.caixa >= CAIXA_MAXIMA) return "dominadas";
      return "aprendendo";
    },
    [progresso, agora],
  );

  const visiveis = useMemo(() => {
    if (filtro === "todas") return verbetes;
    if (filtro.startsWith("n")) return verbetes.filter((v) => String(v.nivel) === filtro.slice(1));
    return verbetes.filter((v) => grupoDe(v) === filtro);
  }, [verbetes, filtro, grupoDe]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, Verbete[]>();
    for (const v of visiveis) {
      const g = grupoDe(v);
      mapa.set(g, [...(mapa.get(g) ?? []), v]);
    }
    return mapa;
  }, [visiveis, grupoDe]);

  return (
    <List
      isLoading={carregando}
      isShowingDetail
      searchBarPlaceholder="Buscar por palavra, classe ou significado…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filtrar" value={filtro} onChange={(v) => setFiltro(v as Filtro)}>
          <List.Dropdown.Section title="Estado">
            <List.Dropdown.Item title="Todas as palavras" value="todas" icon={Icon.List} />
            <List.Dropdown.Item title="Para revisar agora" value="revisar" icon={Icon.Alarm} />
            <List.Dropdown.Item title="Aprendendo" value="aprendendo" icon={Icon.Leaf} />
            <List.Dropdown.Item title="Dominadas" value="dominadas" icon={Icon.Trophy} />
            <List.Dropdown.Item title="Ainda não praticadas" value="novas" icon={Icon.Circle} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Nível">
            <List.Dropdown.Item title="1 · Cotidiano" value="n1" />
            <List.Dropdown.Item title="2 · Culto" value="n2" />
            <List.Dropdown.Item title="3 · Erudito" value="n3" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Book}
        title="Nada aqui com esse filtro"
        description="Troque o filtro à direita da busca ou limpe o termo pesquisado."
      />
      {GRUPOS.filter((g) => (porGrupo.get(g.chave) ?? []).length > 0).map((grupo) => {
        const itens = porGrupo.get(grupo.chave) ?? [];
        return (
          <List.Section key={grupo.chave} title={grupo.titulo} subtitle={String(itens.length)}>
            {itens.map((verbete) => (
              <ItemDoVocabulario
                key={verbete.palavra}
                verbete={verbete}
                registro={progresso[verbete.palavra]}
                agora={agora}
                aoDominar={() => marcarDominada(verbete)}
                aoEsquecer={() => esquecer(verbete)}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function ItemDoVocabulario(props: {
  verbete: Verbete;
  registro: RegistroPalavra | undefined;
  agora: number;
  aoDominar: () => void;
  aoEsquecer: () => void;
}) {
  const { verbete, registro, agora, aoDominar, aoEsquecer } = props;
  const caixa = registro?.caixa ?? 0;

  return (
    <List.Item
      icon={{ source: caixa >= CAIXA_MAXIMA ? Icon.Trophy : Icon.CircleFilled, tintColor: corDaCaixa(caixa) }}
      title={verbete.palavra}
      keywords={[
        verbete.classe,
        ROTULO_NIVEL[verbete.nivel],
        semAcento(verbete.palavra),
        ...verbete.significado.split(/\s+/),
      ]}
      detail={
        <List.Item.Detail
          markdown={markdownDoVerbete(verbete)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Domínio"
                text={`${medidorDeCaixa(caixa)}  ${rotuloDeCaixa(caixa)}`}
                icon={{ source: Icon.Gauge, tintColor: corDaCaixa(caixa) }}
              />
              <List.Item.Detail.Metadata.Label
                title="Próxima revisão"
                text={proximaRevisaoEmTexto(registro, agora)}
                icon={Icon.Clock}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Tentativas"
                text={String(registro?.tentativas ?? 0)}
                icon={Icon.Repeat}
              />
              <List.Item.Detail.Metadata.Label
                title="Sem nenhum deslize"
                text={`${registro?.acertosLimpos ?? 0}`}
                icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              />
              <List.Item.Detail.Metadata.Label
                title="Deslizes acumulados"
                text={String(registro?.deslizesTotais ?? 0)}
                icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
              />
              <List.Item.Detail.Metadata.Label
                title="Melhor velocidade"
                text={ppmTexto(registro?.melhorPpm ?? 0)}
                icon={Icon.Bolt}
              />
              {registro?.vistaEm ? (
                <List.Item.Detail.Metadata.Label
                  title="Praticada pela última vez"
                  text={`há ${duracao((agora - registro.vistaEm) / 1000)}`}
                  icon={Icon.Calendar}
                />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Nível">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${verbete.nivel} · ${ROTULO_NIVEL[verbete.nivel]}`}
                  color={Color.Blue}
                />
                <List.Item.Detail.Metadata.TagList.Item text={verbete.classe} color={Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <AbrirPratica palavra={verbete.palavra} />
            <Action.CopyToClipboard
              title="Copiar a palavra"
              content={verbete.palavra}
              shortcut={ATALHOS.copiarPalavra}
            />
            <Action.CopyToClipboard
              title="Copiar a frase de exemplo"
              content={verbete.exemplo}
              shortcut={ATALHOS.copiarExemplo}
            />
            <Action.CopyToClipboard
              title="Copiar o verbete inteiro"
              content={textoParaCopiar(verbete)}
              shortcut={ATALHOS.copiarVerbete}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Histórico desta palavra">
            <Action title="Marcar como dominada" icon={Icon.Trophy} shortcut={ATALHOS.dominar} onAction={aoDominar} />
            <Action
              title="Apagar o histórico desta palavra"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={ATALHOS.esquecer}
              onAction={aoEsquecer}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <AbrirProgresso />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
