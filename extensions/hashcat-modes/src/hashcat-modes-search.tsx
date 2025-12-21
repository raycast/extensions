import { ActionPanel, Action, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { Root } from "remark-parse/lib";

const HASHCAT_DOCS_URL =
  "https://raw.githubusercontent.com/hashcat/hashcat/refs/heads/master/docs/hashcat-example-hashes.md";

const SEARCHABLE_FIELDS = ["hash-name", "hash-mode", "example"] as const;

type HashcatMode = {
  "hash-mode": string;
  "hash-name": string;
  kernels: string;
  test: string;
  example: string;
};

type SearchableField = (typeof SEARCHABLE_FIELDS)[number];

interface TableNode {
  type: "table";
  children: TableRowNode[];
}

interface TableRowNode {
  type: "tableRow";
  children: TableCellNode[];
}

interface TableCellNode {
  type: "tableCell";
  children: PhrasingContentNode[];
}

type PhrasingContentNode =
  | { type: "text"; value: string }
  | { type: "inlineCode"; value: string }
  | { type: string; children?: PhrasingContentNode[]; value?: string };

function parseMarkdown(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
}

function extractTables(ast: Root): TableNode[] {
  return ast.children.filter((node): node is TableNode => node.type === "table");
}

function cleanText(node: PhrasingContentNode | PhrasingContentNode[] | undefined): string {
  if (!node) return "";

  if (Array.isArray(node)) {
    return node.map(cleanText).join("");
  }

  if (node.type === "text") {
    return node.value ?? "";
  }

  if (node.type === "inlineCode") {
    return node.value ?? "";
  }

  if ("children" in node && Array.isArray(node.children)) {
    return node.children.map(cleanText).join("");
  }

  return "";
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "-");
}

function tableToObjects(table: TableNode): HashcatMode[] {
  if (!table.children || table.children.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = table.children;

  if (!headerRow || headerRow.type !== "tableRow") {
    return [];
  }

  const headers: string[] = headerRow.children.map((cell: TableCellNode) => {
    const headerText = cleanText(cell.children ?? []);
    return normalizeHeader(headerText);
  });

  return dataRows
    .filter((row): row is TableRowNode => row.type === "tableRow")
    .map((row: TableRowNode) => {
      const obj: Record<string, string> = {};
      row.children.forEach((cell: TableCellNode, index: number) => {
        const header = headers[index];
        if (header) {
          obj[header] = cleanText(cell.children ?? []).trim();
        }
      });
      return obj as HashcatMode;
    });
}

async function parseFetchResponse(response: Response): Promise<HashcatMode[]> {
  if (!response.ok) {
    throw new Error(`Failed to fetch hashcat docs: ${response.statusText}`);
  }

  const markdown = await response.text();
  const ast = parseMarkdown(markdown);
  const tables = extractTables(ast);

  if (tables.length === 0) {
    throw new Error("No tables found in markdown document");
  }

  return tableToObjects(tables[0]);
}

function filterHashcatModes(data: HashcatMode[], searchText: string): HashcatMode[] {
  if (!searchText.trim()) {
    return data;
  }

  const normalizedSearch = searchText.toLowerCase();

  return data.filter((mode) =>
    SEARCHABLE_FIELDS.some((field: SearchableField) => mode[field].toLowerCase().includes(normalizedSearch)),
  );
}

function HashcatModeListItem({ mode }: { mode: HashcatMode }) {
  return (
    <List.Item
      title={mode["hash-name"]}
      subtitle={mode["hash-mode"]}
      accessories={[{ text: mode.example }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Hashcat Mode" content={mode["hash-mode"]} />
            <Action.CopyToClipboard title="Copy Hash Name" content={mode["hash-name"]} />
            <Action.CopyToClipboard title="Copy Example Hash" content={mode.example} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, error } = useFetch<HashcatMode[]>(HASHCAT_DOCS_URL, {
    parseResponse: parseFetchResponse,
  });

  const filteredData = useMemo(() => {
    return filterHashcatModes(data ?? [], searchText);
  }, [data, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search hashcat modes..."
      throttle
    >
      {error && (
        <List.EmptyView
          title="Error loading data"
          description={error.message || "Failed to fetch hashcat documentation"}
        />
      )}
      {!error && (
        <List.Section
          title="Results"
          subtitle={filteredData.length > 0 ? `${filteredData.length} of ${data?.length ?? 0}` : undefined}
        >
          {filteredData.length === 0 && !isLoading ? (
            <List.EmptyView title="No results found" description="Try a different search term" />
          ) : (
            filteredData.map((mode) => <HashcatModeListItem key={mode["hash-mode"]} mode={mode} />)
          )}
        </List.Section>
      )}
    </List>
  );
}
