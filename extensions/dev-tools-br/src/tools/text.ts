import { Icon } from "@raycast/api";
import type { ToolDefinition } from "../types";
import {
  analyzeText,
  characterInfo,
  convertCase,
  convertHtml,
  correctCommonPortuguese,
  countOccurrences,
  fancyTextVariants,
  numberToPortuguese,
  removeAccents,
  replaceLineBreaks,
  reverseText,
  sortLines,
  splitString,
} from "../lib/text-tools";
import { booleanValue, numberValue, simpleResult, stringValue, textField } from "./helpers";

const textarea = (name: string, title: string, placeholder: string) => ({
  type: "textarea" as const,
  name,
  title,
  placeholder,
  required: true,
});

export const textTools: ToolDefinition[] = [
  {
    id: "spell-check",
    title: "Corretor Ortográfico",
    description: "Corrige uma lista local de erros frequentes em português.",
    category: "Texto",
    icon: Icon.Check,
    fields: [textarea("text", "Texto", "Cole o texto")],
    run: (values) =>
      simpleResult(
        "Texto corrigido",
        correctCommonPortuguese(stringValue(values, "text")),
        "Correção rápida e offline de erros comuns; não substitui revisão gramatical completa.",
      ),
  },
  {
    id: "alphabetical-order",
    title: "Colocar em Ordem Alfabética",
    description: "Ordena linhas com regras de comparação do português brasileiro.",
    category: "Texto",
    icon: Icon.List,
    fields: [
      textarea("text", "Linhas", "Uma entrada por linha"),
      {
        type: "dropdown",
        name: "direction",
        title: "Ordem",
        defaultValue: "asc",
        options: [
          { title: "Crescente (A–Z)", value: "asc" },
          { title: "Decrescente (Z–A)", value: "desc" },
        ],
      },
    ],
    run: (values) =>
      simpleResult(
        "Linhas ordenadas",
        sortLines(stringValue(values, "text"), stringValue(values, "direction", "asc") as "asc" | "desc"),
      ),
  },
  {
    id: "character-counter",
    title: "Contador de Caracteres",
    description: "Conta caracteres, palavras, linhas e bytes UTF-8.",
    category: "Texto",
    icon: Icon.Hashtag,
    fields: [textarea("text", "Texto", "Cole o texto")],
    run: (values) => simpleResult("Análise do texto", analyzeText(stringValue(values, "text"))),
  },
  {
    id: "word-occurrence-counter",
    title: "Contador de Ocorrência de Palavra",
    description: "Conta quantas vezes uma palavra ou trecho aparece.",
    category: "Texto",
    icon: Icon.MagnifyingGlass,
    fields: [
      textarea("text", "Texto", "Cole o texto"),
      textField("query", "Palavra ou trecho", "Laravel"),
      {
        type: "checkbox",
        name: "caseSensitive",
        title: "Opções",
        label: "Diferenciar maiúsculas",
        defaultValue: false,
      },
      { type: "checkbox", name: "wholeWord", title: "", label: "Palavra inteira", defaultValue: true },
    ],
    run: (values) =>
      simpleResult(
        "Ocorrências",
        String(
          countOccurrences(
            stringValue(values, "text"),
            stringValue(values, "query"),
            booleanValue(values, "caseSensitive"),
            booleanValue(values, "wholeWord", true),
          ),
        ),
      ),
  },
  {
    id: "text-html-converter",
    title: "Converter Texto ↔ HTML",
    description: "Codifica ou decodifica entidades HTML.",
    category: "Texto",
    icon: Icon.Code,
    fields: [
      {
        type: "dropdown",
        name: "operation",
        title: "Operação",
        defaultValue: "encode",
        options: [
          { title: "Texto para entidades HTML", value: "encode" },
          { title: "Entidades HTML para texto", value: "decode" },
        ],
      },
      textarea("text", "Conteúdo", "<div>Olá & bem-vindo</div>"),
    ],
    run: (values) =>
      simpleResult(
        "Conversão HTML",
        convertHtml(stringValue(values, "text"), stringValue(values, "operation")),
      ),
  },
  {
    id: "cut-text",
    title: "Cortar Textos",
    description: "Limita o texto a uma quantidade de caracteres Unicode.",
    category: "Texto",
    icon: Icon.Crop,
    fields: [
      textarea("text", "Texto", "Cole o texto"),
      textField("length", "Máximo de caracteres", "100", true, "100"),
      {
        type: "checkbox",
        name: "ellipsis",
        title: "Sufixo",
        label: "Adicionar reticências",
        defaultValue: true,
      },
    ],
    run(values) {
      const characters = [...stringValue(values, "text")];
      const limit = numberValue(values, "length", 0, 1_000_000, 100);
      const wasCut = characters.length > limit;
      return simpleResult(
        "Texto cortado",
        `${characters.slice(0, limit).join("")}${wasCut && booleanValue(values, "ellipsis", true) ? "…" : ""}`,
      );
    },
  },
  {
    id: "split-string",
    title: "Dividir String",
    description: "Divide texto por delimitador e devolve lista, linhas ou JSON.",
    category: "Texto",
    icon: Icon.AppWindowList,
    fields: [
      textarea("text", "Texto", "um,dois,três"),
      textField("delimiter", "Delimitador", ",", true, ","),
      {
        type: "dropdown",
        name: "output",
        title: "Saída",
        defaultValue: "json",
        options: [
          { title: "JSON", value: "json" },
          { title: "Uma entrada por linha", value: "lines" },
          { title: "Separado por vírgulas", value: "comma" },
        ],
      },
    ],
    run: (values) =>
      simpleResult(
        "String dividida",
        splitString(
          stringValue(values, "text"),
          stringValue(values, "delimiter", ","),
          stringValue(values, "output", "json"),
        ),
      ),
  },
  {
    id: "character-information",
    title: "Informações de Caracter",
    description: "Mostra Unicode, decimal, hexadecimal e bytes UTF-8.",
    category: "Texto",
    icon: Icon.Info,
    fields: [textField("text", "Caractere", "Á")],
    run: (values) => simpleResult("Informações do caractere", characterInfo(stringValue(values, "text"))),
  },
  {
    id: "reverse-text",
    title: "Inverter Texto",
    description: "Inverte o texto preservando caracteres Unicode compostos.",
    category: "Texto",
    icon: Icon.ArrowLeft,
    fields: [textarea("text", "Texto", "Olá, mundo!")],
    run: (values) => simpleResult("Texto invertido", reverseText(stringValue(values, "text"))),
  },
  {
    id: "custom-fonts",
    title: "Letras Personalizadas",
    description: "Converte o texto em estilos Unicode.",
    category: "Texto",
    icon: Icon.Text,
    fields: [textField("text", "Texto", "Dev Tools BR")],
    run: (values) => simpleResult("Letras personalizadas", fancyTextVariants(stringValue(values, "text"))),
  },
  {
    id: "convert-case",
    title: "Maiúsculas e Minúsculas",
    description: "Converte caixa de texto e nomes de identificadores.",
    category: "Texto",
    icon: Icon.TextInput,
    fields: [
      {
        type: "dropdown",
        name: "mode",
        title: "Formato",
        defaultValue: "upper",
        options: [
          { title: "MAIÚSCULAS", value: "upper" },
          { title: "minúsculas", value: "lower" },
          { title: "Título", value: "title" },
          { title: "Frase", value: "sentence" },
          { title: "camelCase", value: "camel" },
          { title: "PascalCase", value: "pascal" },
          { title: "snake_case", value: "snake" },
          { title: "kebab-case", value: "kebab" },
        ],
      },
      textarea("text", "Texto", "meu texto de exemplo"),
    ],
    run: (values) =>
      simpleResult("Texto convertido", convertCase(stringValue(values, "text"), stringValue(values, "mode"))),
  },
  {
    id: "number-in-words",
    title: "Número por Extenso",
    description: "Escreve números inteiros por extenso em português.",
    category: "Texto",
    icon: Icon.NumberList,
    fields: [textField("number", "Número", "1234")],
    run: (values) => simpleResult("Número por extenso", numberToPortuguese(stringValue(values, "number"))),
  },
  {
    id: "remove-accents",
    title: "Remover Acentos do Texto",
    description: "Remove diacríticos usando normalização Unicode.",
    category: "Texto",
    icon: Icon.Eraser,
    fields: [textarea("text", "Texto", "Ação, órgão, você e São Luís")],
    run: (values) => simpleResult("Texto sem acentos", removeAccents(stringValue(values, "text"))),
  },
  {
    id: "replace-line-breaks",
    title: "Remover ou Trocar Quebras de Linha",
    description: "Substitui CRLF/LF por qualquer texto.",
    category: "Texto",
    icon: Icon.ArrowRight,
    fields: [
      textarea("text", "Texto", "linha 1\nlinha 2"),
      textField("replacement", "Substituir por", "espaço", false, " "),
    ],
    run: (values) =>
      simpleResult(
        "Quebras substituídas",
        replaceLineBreaks(stringValue(values, "text"), stringValue(values, "replacement", " ")),
      ),
  },
];
