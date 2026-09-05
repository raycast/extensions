import { Icon } from "@raycast/api";
import type { ToolDefinition } from "../types";
import {
  convertBase64,
  convertBinary,
  convertUrl,
  formatJson,
  generateUuids,
  hashText,
} from "../lib/computer-tools";
import { booleanValue, numberValue, simpleResult, stringValue, textField } from "./helpers";

const textarea = (placeholder: string) => ({
  type: "textarea" as const,
  name: "text",
  title: "Conteúdo",
  placeholder,
  required: true,
});
const operationField = (encodeTitle: string, decodeTitle: string) => ({
  type: "dropdown" as const,
  name: "operation",
  title: "Operação",
  defaultValue: "encode",
  options: [
    { title: encodeTitle, value: "encode" },
    { title: decodeTitle, value: "decode" },
  ],
});

export const computerTools: ToolDefinition[] = [
  {
    id: "base64",
    title: "Base64 Encode/Decode",
    description: "Codifica ou decodifica Base64 localmente.",
    category: "Computação",
    icon: Icon.Code,
    fields: [operationField("Codificar", "Decodificar"), textarea("Texto ou Base64")],
    run: (values) =>
      simpleResult(
        "Resultado Base64",
        convertBase64(stringValue(values, "text"), stringValue(values, "operation")),
      ),
  },
  {
    id: "binary-translator",
    title: "Tradutor de Código Binário",
    description: "Converte UTF-8 entre texto e bytes binários.",
    category: "Computação",
    icon: Icon.CodeBlock,
    fields: [
      operationField("Texto para binário", "Binário para texto"),
      textarea("Olá ou 01001111 01101001"),
    ],
    run: (values) =>
      simpleResult(
        "Conversão binária",
        convertBinary(stringValue(values, "text"), stringValue(values, "operation")),
      ),
  },
  {
    id: "url-encode-decode",
    title: "URL Encode/Decode",
    description: "Codifica e decodifica componentes de URL.",
    category: "Computação",
    icon: Icon.Link,
    fields: [operationField("URL encode", "URL decode"), textarea("https://example.test/busca?q=olá mundo")],
    run: (values) =>
      simpleResult(
        "Conversão de URL",
        convertUrl(stringValue(values, "text"), stringValue(values, "operation")),
      ),
  },
  {
    id: "json-formatter",
    title: "Formatar/Minificar JSON",
    description: "Valida e formata JSON sem enviar dados para a internet.",
    category: "Computação",
    icon: Icon.CodeBlock,
    fields: [
      { type: "textarea", name: "text", title: "JSON", placeholder: '{"ok":true}', required: true },
      { type: "checkbox", name: "minify", title: "Formato", label: "Minificar", defaultValue: false },
    ],
    run: (values) =>
      simpleResult("JSON", formatJson(stringValue(values, "text"), booleanValue(values, "minify"))),
  },
  {
    id: "hash-generator",
    title: "Gerador de Hash",
    description: "Calcula MD5, SHA-1, SHA-256 ou SHA-512.",
    category: "Computação",
    icon: Icon.Fingerprint,
    fields: [
      {
        type: "dropdown",
        name: "algorithm",
        title: "Algoritmo",
        defaultValue: "sha256",
        options: [
          { title: "SHA-256", value: "sha256" },
          { title: "SHA-512", value: "sha512" },
          { title: "SHA-1 (legado)", value: "sha1" },
          { title: "MD5 (legado)", value: "md5" },
        ],
      },
      textarea("Texto"),
    ],
    run: (values) =>
      simpleResult(
        "Hash",
        hashText(
          stringValue(values, "text"),
          stringValue(values, "algorithm", "sha256") as "md5" | "sha1" | "sha256" | "sha512",
        ),
      ),
  },
  {
    id: "uuid-generator",
    title: "Gerador de UUID",
    description: "Gera UUIDs v4 usando o gerador criptográfico do sistema.",
    category: "Computação",
    icon: Icon.Fingerprint,
    fields: [textField("amount", "Quantidade", "10", true, "10")],
    run: (values) =>
      simpleResult("UUIDs gerados", generateUuids(numberValue(values, "amount", 1, 1_000, 10))),
  },
];
