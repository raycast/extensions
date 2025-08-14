import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Icon,
  Detail,
  Form,
  useNavigation,
} from "@raycast/api";
import { JUITApiClient } from "./api";
import { Jurisprudence, SearchFilters, ExtendedPreferences } from "./types";
import { LLMService, LLMProvider } from "./llm-service";
import {
  formatDate,
  getJurisprudenceSubtitle,
  validateSearchQuery,
  sanitizeSearchQuery,
  buildSearchQuery,
} from "./utils";
import { COURTS, SORT_OPTIONS } from "./constants";
import { LLMSummary, useLLMAvailable } from "./llm-summary";

interface SearchFormValues {
  query: string;
  searchFields: string[];
  courts: string[];
  sortBy: string;
  exactMatch: boolean;
}

function SearchForm() {
  const { push } = useNavigation();

  function handleSubmit(values: SearchFormValues) {
    if (!validateSearchQuery(values.query)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Erro",
        message: "A consulta deve ter pelo menos 2 caracteres",
      });
      return;
    }

    const filters: SearchFilters = {
      searchFields: values.searchFields as ("title" | "headnote" | "full_text")[],
      courts: values.courts,
      sortBy: values.sortBy as "juridical_relevance" | "relevance" | "newest" | "oldest",
    };

    push(<SearchResults query={values.query} filters={filters} exactMatch={values.exactMatch} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Buscar Jurisprudência"
            icon={Icon.MagnifyingGlass}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="query"
        title="Termo de Busca"
        placeholder="Ex: indenização E 'danos morais'"
        info="Use 'E', 'OU', 'MASNAO' para operadores lógicos. Use aspas para busca exata."
      />

      <Form.Checkbox
        id="exactMatch"
        title="Busca Exata"
        label="Buscar termo exato (entre aspas)"
        info="Marque para buscar exatamente o termo digitado"
      />

      <Form.TagPicker
        id="searchFields"
        title="Campos de Busca"
        defaultValue={["headnote", "full_text"]}
      >
        <Form.TagPicker.Item value="title" title="Título" />
        <Form.TagPicker.Item value="headnote" title="Ementa" />
        <Form.TagPicker.Item value="full_text" title="Inteiro Teor" />
      </Form.TagPicker>

      <Form.Dropdown id="sortBy" title="Ordenação" defaultValue="juridical_relevance">
        <Form.Dropdown.Item value="juridical_relevance" title="Relevância Jurídica da JUIT" />
        <Form.Dropdown.Item value="relevance" title="Relevância" />
        <Form.Dropdown.Item value="newest" title="Mais Recentes" />
        <Form.Dropdown.Item value="oldest" title="Mais Antigos" />
      </Form.Dropdown>

      <Form.TagPicker
        id="courts"
        title="Tribunais"
        placeholder="Selecione tribunais específicos (opcional)"
      >
        {Object.entries(COURTS).map(([code, name]) => (
          <Form.TagPicker.Item key={code} value={code} title={`${code} - ${name}`} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function SearchResults({
  query,
  filters,
  exactMatch,
}: {
  query: string;
  filters: SearchFilters;
  exactMatch: boolean;
}) {
  const preferences = getPreferenceValues<ExtendedPreferences>();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jurisprudences, setJurisprudences] = useState<Jurisprudence[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const llmAvailable = useLLMAvailable();

  const apiClient = useMemo(() => {
    return new JUITApiClient(
      preferences.apiUsername,
      preferences.apiPassword,
      preferences.apiOwner
    );
  }, [preferences]);

  const llmService = useMemo(() => {
    return new LLMService({
      anthropicApiKey: preferences.anthropicApiKey,
      anthropicModel: preferences.anthropicModel,
      geminiApiKey: preferences.geminiApiKey,
      geminiModel: preferences.geminiModel,
      openaiApiKey: preferences.openaiApiKey,
      openaiModel: preferences.openaiModel,
      mistralApiKey: preferences.mistralApiKey,
      mistralModel: preferences.mistralModel,
      defaultLlm: preferences.defaultLlm,
    });
  }, [preferences]);

  const defaultProviderIcon = useMemo(() => {
    const defaultProvider = (preferences.defaultLlm as LLMProvider) || "anthropic";
    return llmService.getProviderIcon(defaultProvider);
  }, [preferences.defaultLlm, llmService]);

  const performSearch = async (isNewSearch = true) => {
    setIsLoading(true);

    try {
      const processedQuery = exactMatch
        ? `"${sanitizeSearchQuery(query)}"`
        : buildSearchQuery(sanitizeSearchQuery(query));

      const sortConfig = SORT_OPTIONS[filters.sortBy as keyof typeof SORT_OPTIONS];

      const searchParams = {
        query: processedQuery,
        owner: preferences.apiOwner,
        search_on: filters.searchFields,
        sort_by_field: sortConfig.field,
        sort_by_direction: sortConfig.direction,
        ...(filters.courts.length > 0 && { court_code: filters.courts }),
        ...(isNewSearch
          ? {}
          : {
              search_id: searchId || undefined,
              next_page_token: nextPageToken || undefined,
            }),
      };

      const response = await apiClient.searchJurisprudence(searchParams);

      if (isNewSearch) {
        setJurisprudences(response.items);
        setSearchId(response.search_info.search_id);
      } else {
        setJurisprudences((prev) => [...prev, ...response.items]);
      }

      setNextPageToken(response.next_page_token);
      setTotal(response.total);
      setSearchQuery(processedQuery);

      showToast({
        style: Toast.Style.Success,
        title: "Busca realizada",
        message: `${response.total} resultados encontrados`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Erro na busca",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (nextPageToken && !isLoading) {
      performSearch(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Buscando: ${searchQuery}`}
      navigationTitle={`${jurisprudences.length} de ${total} resultados`}
    >
      {jurisprudences.map((jurisprudence) => (
        <List.Item
          key={jurisprudence.id}
          title={jurisprudence.title}
          subtitle={getJurisprudenceSubtitle(jurisprudence)}
          accessories={[
            {
              text: formatDate(jurisprudence.order_date),
              icon: Icon.Calendar,
            },
            {
              text: jurisprudence.court_code,
              icon: Icon.Building,
              tooltip:
                COURTS[jurisprudence.court_code as keyof typeof COURTS] || jurisprudence.court_code,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Ver Detalhes"
                icon={Icon.Eye}
                target={<JurisprudenceDetail jurisprudence={jurisprudence} />}
              />
              {llmAvailable && (
                <Action.Push
                  title="Resumo Inteligente (ia)"
                  icon={defaultProviderIcon}
                  target={<LLMSummary jurisprudence={jurisprudence} />}
                />
              )}
              <Action.OpenInBrowser
                title="Abrir No Rimor"
                url={jurisprudence.rimor_url}
                icon={Icon.Globe}
              />
              <Action.CopyToClipboard
                title="Copiar Título"
                content={jurisprudence.title}
                icon={Icon.Clipboard}
              />
              <Action.CopyToClipboard
                title="Copiar URL Rimor"
                content={jurisprudence.rimor_url}
                icon={Icon.Link}
              />
            </ActionPanel>
          }
        />
      ))}

      {nextPageToken && (
        <List.Item
          title="Carregar mais resultados..."
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action title="Carregar Mais" icon={Icon.Plus} onAction={loadMore} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function JurisprudenceDetail({ jurisprudence }: { jurisprudence: Jurisprudence }) {
  const llmAvailable = useLLMAvailable();
  const markdown = `
# 📄 ${jurisprudence.title}

## 🏛️ Informações Gerais
- **🏛️ Tribunal:** ${COURTS[jurisprudence.court_code as keyof typeof COURTS] || jurisprudence.court_code}
- **⚖️ Instância:** ${jurisprudence.degree || "N/A"}
- **👨‍⚖️ Relator/Magistrado:** ${jurisprudence.trier || "N/A"}
- **🏢 Órgão Julgador:** ${jurisprudence.judgment_body || "N/A"}
- **📋 Tipo de Documento:** ${jurisprudence.document_type || "N/A"}
- **⚖️ Tipo de Justiça:** ${jurisprudence.justice_type || "N/A"}

## 📅 Cronologia
- **📅 Data Consolidada:** ${formatDate(jurisprudence.order_date)}
- **⚖️ Data de Julgamento:** ${formatDate(jurisprudence.judgment_date)}
- **📰 Data de Publicação:** ${formatDate(jurisprudence.publication_date)}
- **📱 Data de Disponibilização:** ${formatDate(jurisprudence.release_date)}
- **✍️ Data de Assinatura:** ${formatDate(jurisprudence.signature_date)}

## 📁 Dados Processuais
- **🔢 Número CNJ:** ${jurisprudence.cnj_unique_number || "N/A"}
- **📍 Estado de Origem:** ${jurisprudence.process_origin_state || "N/A"}
- **🏛️ Comarca:** ${jurisprudence.district || "N/A"}

## 🏷️ Classificações
${
  jurisprudence.document_matter_list && jurisprudence.document_matter_list.length > 0
    ? `**📚 Assuntos:** ${jurisprudence.document_matter_list.join(", ")}`
    : ""
}

${
  jurisprudence.process_class_name_list && jurisprudence.process_class_name_list.length > 0
    ? `**📋 Classes Processuais:** ${jurisprudence.process_class_name_list.join(", ")}`
    : ""
}

## 📝 Ementa
${jurisprudence.headnote || "*❌ Ementa não disponível*"}

${
  jurisprudence.full_text
    ? `
## 📄 Inteiro Teor
${jurisprudence.full_text}
`
    : ""
}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Detalhes - ${jurisprudence.court_code}`}
      actions={
        <ActionPanel>
          {llmAvailable && (
            <Action.Push
              title="Resumo Inteligente (ia)"
              icon={Icon.LightBulb}
              target={<LLMSummary jurisprudence={jurisprudence} />}
            />
          )}
          <Action.OpenInBrowser
            title="Abrir No Rimor"
            url={jurisprudence.rimor_url}
            icon={Icon.Globe}
          />
          <Action.CopyToClipboard
            title="Copiar Ementa"
            content={jurisprudence.headnote || ""}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copiar URL Rimor"
            content={jurisprudence.rimor_url}
            icon={Icon.Link}
          />
          <Action.CopyToClipboard
            title="Copiar Dados Completos"
            content={markdown}
            icon={Icon.Document}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchJurisprudenceCommand() {
  return <SearchForm />;
}
