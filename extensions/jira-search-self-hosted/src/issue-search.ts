import { prefs } from "./preferences";

type FilterField = "project" | "issueType" | "status" | "assignee";
type FilterOperation = "include" | "exclude";
type QueryFilters = Partial<Record<FilterField, string[]>>;

interface ParsedIssueQuery {
  filters: QueryFilters;
  textTerms: string[];
}

interface DefaultFilterValues {
  include: string[];
  exclude: string[];
}

type DefaultFilters = Record<FilterField, DefaultFilterValues>;

interface ResolvedFilterClause {
  operation: FilterOperation;
  values: string[];
}

export interface BuildIssueSearchJqlOptions {
  additionalConditions?: string[];
  allowAssigneeFilters?: boolean;
  applyAssigneeDefaults?: boolean;
  forcedAssignee?: string;
}

const STATUS_REGEX = /!([a-z0-9_-]+|"[a-z0-9_ -]+")/gi;
const ASSIGNEE_REGEX = /%([.@a-z0-9_-]+|"[a-z0-9_ -]+")/gi;

const defaultFilters: DefaultFilters = {
  project: {
    include: parsePreferenceList(prefs.defaultIncludeProjects),
    exclude: parsePreferenceList(prefs.defaultExcludeProjects),
  },
  status: {
    include: parsePreferenceList(prefs.defaultIncludeStatuses),
    exclude: parsePreferenceList(prefs.defaultExcludeStatuses),
  },
  issueType: {
    include: parsePreferenceList(prefs.defaultIncludeIssueTypes),
    exclude: parsePreferenceList(prefs.defaultExcludeIssueTypes),
  },
  assignee: {
    include: parsePreferenceList(prefs.defaultIncludeAssignees),
    exclude: parsePreferenceList(prefs.defaultExcludeAssignees),
  },
};

export function buildIssueSearchJql(query: string, options: BuildIssueSearchJqlOptions = {}): string {
  const parsedQuery = parseIssueQuery(query, options.allowAssigneeFilters ?? true);
  const jqlConditions: string[] = [];

  const projectClause = resolveFilterClause("project", parsedQuery.filters);
  const issueTypeClause = resolveFilterClause("issueType", parsedQuery.filters);
  const statusClause = resolveFilterClause("status", parsedQuery.filters);

  if (projectClause) jqlConditions.push(toJqlClause("project", projectClause));
  if (issueTypeClause) jqlConditions.push(toJqlClause("issueType", issueTypeClause));
  if (statusClause) jqlConditions.push(toJqlClause("status", statusClause));

  if (options.forcedAssignee) {
    jqlConditions.push(toJqlClause("assignee", { operation: "include", values: [options.forcedAssignee] }));
  } else {
    const assigneeClause = resolveFilterClause("assignee", parsedQuery.filters, options.applyAssigneeDefaults ?? true);
    if (assigneeClause) jqlConditions.push(toJqlClause("assignee", assigneeClause));
  }

  if (options.additionalConditions) {
    jqlConditions.push(...options.additionalConditions);
  }

  jqlConditions.push(...parsedQuery.textTerms.map((term) => `text~"${escapeJqlValue(term)}*"`));

  return [jqlConditions.join(" AND "), "order by lastViewed desc"].filter(Boolean).join(" ");
}

function parsePreferenceList(value: string): string[] {
  return uniqueValues(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

function parseIssueQuery(query: string, allowAssigneeFilters: boolean): ParsedIssueQuery {
  let sanitizedQuery = query;

  const [statuses, queryWithoutStatuses] = extractPrefixedValues(sanitizedQuery, STATUS_REGEX);
  sanitizedQuery = queryWithoutStatuses;

  const [assignees, queryWithoutAssignees] = extractPrefixedValues(sanitizedQuery, ASSIGNEE_REGEX);
  sanitizedQuery = queryWithoutAssignees;

  const terms = sanitizedQuery.split(/[ "]/).filter((term) => term.length > 0);
  const filters: QueryFilters = {};

  const projects = collectPrefixed("@", terms);
  const issueTypes = collectPrefixed("#", terms);

  if (projects.length > 0) filters.project = projects;
  if (issueTypes.length > 0) filters.issueType = issueTypes;
  if (statuses.length > 0) filters.status = statuses;
  if (allowAssigneeFilters && assignees.length > 0) filters.assignee = assignees;

  const unwantedTextTermChars = /[-+!*&]/;
  const textTerms = terms
    .filter((term) => !"@#!%".includes(term[0]))
    .flatMap((term) => term.split(unwantedTextTermChars))
    .filter((term) => term.length > 0);

  return {
    filters,
    textTerms,
  };
}

function extractPrefixedValues(query: string, regex: RegExp): [string[], string] {
  const values = Array.from(query.matchAll(regex)).map((match) => stripSurroundingQuotes(match[1]));
  return [uniqueValues(values), query.replace(regex, "")];
}

function stripSurroundingQuotes(value: string): string {
  return value.replace(/^"|"$/g, "");
}

function collectPrefixed(prefix: string, terms: string[]): string[] {
  return uniqueValues(
    terms
      .filter((term) => term.startsWith(prefix) && term.length > prefix.length)
      .map((term) => term.substring(prefix.length)),
  );
}

function resolveFilterClause(
  field: FilterField,
  queryFilters: QueryFilters,
  applyDefaults = true,
): ResolvedFilterClause | undefined {
  const queryValues = queryFilters[field];
  if (queryValues && queryValues.length > 0) {
    return { operation: "include", values: queryValues };
  }

  if (!applyDefaults) return undefined;

  const defaults = defaultFilters[field];
  // If both are configured, include defaults take precedence over exclude defaults.
  if (defaults.include.length > 0) {
    return { operation: "include", values: defaults.include };
  }
  if (defaults.exclude.length > 0) {
    return { operation: "exclude", values: defaults.exclude };
  }

  return undefined;
}

function toJqlClause(field: string, clause: ResolvedFilterClause): string {
  const operator = clause.operation === "include" ? "IN" : "NOT IN";
  return `${field} ${operator} (${clause.values.map((value) => `"${escapeJqlValue(value)}"`).join(", ")})`;
}

function escapeJqlValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}
