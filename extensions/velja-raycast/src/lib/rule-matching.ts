import { VeljaMatcher, VeljaMatcherKind, VeljaRule } from "./types";

export interface DomainRuleMatchEvidence {
  matcherId: string;
  kind: VeljaMatcherKind;
  pattern: string;
  fixture: string;
  matchedValue: string;
}

export interface DomainRuleMatch {
  rule: VeljaRule;
  matchedMatchers: DomainRuleMatchEvidence[];
}

interface DomainQueryContext {
  host?: string;
  urlCandidates: string[];
}

function normalizeHost(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

function parseHost(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return normalizeHost(new URL(trimmed).hostname);
  } catch {
    // Fall through to host-like input parsing.
  }

  const hostCandidate = trimmed.replace(/^\/*/, "").split("/")[0]?.split("?")[0]?.split("#")[0];
  if (!hostCandidate || !/^[a-zA-Z0-9.-]+$/.test(hostCandidate)) {
    return undefined;
  }

  return normalizeHost(hostCandidate);
}

function parseHostPattern(pattern: string): string | undefined {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return normalizeHost(new URL(trimmed).hostname);
  } catch {
    // Fall through to host-like pattern parsing.
  }

  const withoutWildcard = trimmed.replace(/^\*\./, "").replace(/^\./, "");
  const hostCandidate = withoutWildcard.split("/")[0]?.split("?")[0]?.split("#")[0];
  if (!hostCandidate || !/^[a-zA-Z0-9.-]+$/.test(hostCandidate)) {
    return undefined;
  }

  return normalizeHost(hostCandidate);
}

function normalizeUrlCandidate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).toString().toLowerCase();
  } catch {
    // Fall through to domain-like input parsing.
  }

  try {
    const withScheme = `https://${trimmed.replace(/^\/*/, "")}`;
    return new URL(withScheme).toString().toLowerCase();
  } catch {
    return undefined;
  }
}

function buildDomainQueryContext(query: string): DomainQueryContext {
  const host = parseHost(query);
  const urlCandidates: string[] = [];

  function addUrlCandidate(value?: string) {
    if (!value) {
      return;
    }

    const normalized = normalizeUrlCandidate(value);
    if (!normalized || urlCandidates.includes(normalized)) {
      return;
    }

    urlCandidates.push(normalized);
  }

  addUrlCandidate(query);

  if (host) {
    addUrlCandidate(`https://${host}`);
    addUrlCandidate(`https://${host}/`);
    addUrlCandidate(`http://${host}`);
    addUrlCandidate(`http://${host}/`);
  }

  return {
    host,
    urlCandidates,
  };
}

function matchHost(matcher: VeljaMatcher, context: DomainQueryContext): DomainRuleMatchEvidence | undefined {
  if (!context.host) {
    return undefined;
  }

  const normalizedPattern = parseHostPattern(matcher.pattern);
  if (!normalizedPattern || context.host !== normalizedPattern) {
    return undefined;
  }

  return {
    matcherId: matcher.id,
    kind: matcher.kind,
    pattern: matcher.pattern,
    fixture: matcher.fixture,
    matchedValue: context.host,
  };
}

function matchHostSuffix(matcher: VeljaMatcher, context: DomainQueryContext): DomainRuleMatchEvidence | undefined {
  if (!context.host) {
    return undefined;
  }

  const normalizedPattern = parseHostPattern(matcher.pattern);
  if (!normalizedPattern) {
    return undefined;
  }

  const matches = context.host === normalizedPattern || context.host.endsWith(`.${normalizedPattern}`);
  if (!matches) {
    return undefined;
  }

  return {
    matcherId: matcher.id,
    kind: matcher.kind,
    pattern: matcher.pattern,
    fixture: matcher.fixture,
    matchedValue: context.host,
  };
}

function matchUrlPrefix(matcher: VeljaMatcher, context: DomainQueryContext): DomainRuleMatchEvidence | undefined {
  const normalizedPattern = normalizeUrlCandidate(matcher.pattern);
  if (!normalizedPattern) {
    return undefined;
  }

  const matchedValue = context.urlCandidates.find((candidate) => candidate.startsWith(normalizedPattern));
  if (!matchedValue) {
    return undefined;
  }

  return {
    matcherId: matcher.id,
    kind: matcher.kind,
    pattern: matcher.pattern,
    fixture: matcher.fixture,
    matchedValue,
  };
}

function matchMatcher(matcher: VeljaMatcher, context: DomainQueryContext): DomainRuleMatchEvidence | undefined {
  if (matcher.kind === "host") {
    return matchHost(matcher, context);
  }

  if (matcher.kind === "hostSuffix") {
    return matchHostSuffix(matcher, context);
  }

  if (matcher.kind === "urlPrefix") {
    return matchUrlPrefix(matcher, context);
  }

  return undefined;
}

export function findRulesByDomainOrUrl(rules: VeljaRule[], query: string): DomainRuleMatch[] {
  const context = buildDomainQueryContext(query);

  return rules
    .map((rule) => ({
      rule,
      matchedMatchers: rule.matchers
        .map((matcher) => matchMatcher(matcher, context))
        .filter((value): value is DomainRuleMatchEvidence => Boolean(value)),
    }))
    .filter((result) => result.matchedMatchers.length > 0);
}
