import {
  GraphQLError,
  GraphQLSchema,
  Kind,
  Lexer,
  OperationDefinitionNode,
  parse,
  print,
  Source,
  Token,
  TokenKind,
} from "graphql";
import { describeVariable, VariableSpec } from "./variables";

export type OperationType = "query" | "mutation" | "subscription";

export interface OperationInfo {
  /** Undefined for an anonymous operation */
  name?: string;
  type: OperationType;
  variables: VariableSpec[];
}

export interface DocumentInfo {
  operations: OperationInfo[];
  error?: string;
}

export function describeSyntaxError(error: unknown): string {
  if (error instanceof GraphQLError) {
    const location = error.locations?.[0];
    return location ? `${error.message} (line ${location.line}, column ${location.column})` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

const cache = new Map<string, DocumentInfo>();

/**
 * Parses a GraphQL document and describes its operations and variables. Results without a schema are memoised
 * because list items re-analyse their query on every render.
 */
export function analyzeDocument(source: string, schema?: GraphQLSchema): DocumentInfo {
  if (!schema && cache.has(source)) return cache.get(source)!;

  let info: DocumentInfo;
  try {
    const document = parse(source);
    const operations = document.definitions.filter(
      (definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION,
    );
    info = {
      operations: operations.map((operation) => ({
        name: operation.name?.value,
        type: operation.operation as OperationType,
        variables: (operation.variableDefinitions ?? []).map((definition) => describeVariable(definition, schema)),
      })),
    };
    if (operations.length === 0) {
      info.error = "The document contains no query or mutation";
    } else if (operations.length > 1 && operations.some((operation) => !operation.name)) {
      info.error = "Anonymous operations must be the only operation in the document";
    }
  } catch (error) {
    info = { operations: [], error: describeSyntaxError(error) };
  }

  if (!schema) {
    if (cache.size > 200) cache.clear();
    cache.set(source, info);
  }
  return info;
}

export function operationLabel(operation: Pick<OperationInfo, "name" | "type">): string {
  return operation.name ? `${operation.type} ${operation.name}` : `anonymous ${operation.type}`;
}

/** True when the document contains `#` comments, which `print()` would drop. */
export function hasComments(source: string): boolean {
  try {
    const lexer = new Lexer(new Source(source));
    while (lexer.advance().kind !== TokenKind.EOF) {
      // Walk to the end so the whole token list is materialised.
    }
    for (let token: Token | null = lexer.token; token; token = token.prev) {
      if (token.kind === TokenKind.COMMENT) return true;
    }
  } catch {
    return false;
  }
  return false;
}

/** Pretty-prints a GraphQL document. Throws a readable error when it does not parse. */
export function formatDocument(source: string): string {
  try {
    return print(parse(source));
  } catch (error) {
    throw new Error(describeSyntaxError(error));
  }
}
