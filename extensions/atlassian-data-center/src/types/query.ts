import type { SearchFilter } from "@/types";

export type QueryType = "JQL" | "CQL";

export type LogicOperator = "AND" | "OR" | "NOT";

export type ProcessUserInputParams = {
  userInput: string;
  filter?: SearchFilter | null;
  buildClauseFromText: (input: string) => string;
  queryType: QueryType;
};
