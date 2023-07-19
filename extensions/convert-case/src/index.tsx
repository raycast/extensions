import { ActionPanel, Action, List } from "@raycast/api";
import { useEffect, useState } from "react";

const SEPARATOR = " ";

enum CaseType {
  CAMEL = "camelCase",
  KEBAB = "kebab-case",
  PASCAL = "PascalCase",
  SNAKE = "snake_case",
  DOT = "dot.case",
  CONSTANT = "CONSTANT_CASE",
  PATH = "path/case",
}

interface Result {
  key: CaseType;
  data: string;
}

type Mapper = {
  [key in CaseType]: (s: string) => string;
};

const handlers: Mapper = {
  [CaseType.CAMEL]: toCamelCase,
  [CaseType.KEBAB]: toKebabCase,
  [CaseType.PASCAL]: toPascalCase,
  [CaseType.SNAKE]: toSnakeCase,
  [CaseType.PATH]: toPathCase,
  [CaseType.CONSTANT]: toConstantCase,
  [CaseType.DOT]: toDotCase,
};

export default function Command() {
  const [input, setInput] = useState<string>("");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    if (!input || !input.length) {
      setResults([]);
      return;
    }

    const results = Object.values(CaseType).map((caseType) => {
      const fn = handlers[caseType as CaseType];

      return {
        key: caseType,
        data: fn(input),
      };
    });

    setResults(results);
  }, [input, setResults]);

  return (
    <List onSearchTextChange={setInput} searchBarPlaceholder="Type your input string..." throttle>
      <List.Section title="Results" subtitle={results?.length + ""}>
        {results?.map(({ key, data }) => (
          <List.Item key={key} title={data} subtitle={key} actions={<ItemActions content={data} />} />
        ))}
      </List.Section>
    </List>
  );
}

function ItemActions({ content }: { content: string }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy" content={content} shortcut={{ modifiers: ["cmd"], key: "." }} />
    </ActionPanel>
  );
}

function sanitize(input: string): string[] {
  return input.split(SEPARATOR).filter((x) => !!x);
}

function capitalize(s: string): string {
  const [first, ...rest] = s.split("");

  return [first.toUpperCase(), ...rest].join("");
}

function toCamelCase(input: string): string {
  return sanitize(input)
    .map((s, index) => (index > 0 ? capitalize(s) : s.toLowerCase()))
    .join("");
}

function toPascalCase(input: string): string {
  return sanitize(input).map(capitalize).join("");
}

function toSnakeCase(input: string): string {
  return sanitize(input).join("_");
}

function toKebabCase(input: string): string {
  return sanitize(input).join("-");
}

function toDotCase(input: string): string {
  return sanitize(input).join(".");
}

function toPathCase(input: string): string {
  return sanitize(input).join("/");
}

function toConstantCase(input: string): string {
  return sanitize(input)
    .map((x) => x.toUpperCase())
    .join("_");
}
