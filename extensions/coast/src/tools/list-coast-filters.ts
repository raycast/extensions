import {
  listApplications,
  listDomains,
  type ApplicationIdentifier,
} from "../coast";
import { pageItems, type Pagination } from "../pagination";

type Input = {
  /**
   * Which filter identifiers to return.
   */
  kind?: "applications" | "domains" | "all";
  /** Maximum identifiers in this page. Defaults to 50 and is capped at 200. */
  limit?: number;
  /** Zero-based identifier offset returned by a previous page. */
  offset?: number;
};

type NextInput = {
  kind: "applications" | "domains" | "all";
  limit: number;
  offset: number;
};

type Output = {
  applications?: ApplicationIdentifier[];
  domains?: string[];
  pagination: Pagination;
  next_input?: NextInput;
  coverage: string;
};

type FilterEntry =
  | { kind: "application"; value: ApplicationIdentifier }
  | { kind: "domain"; value: string };

export function coastFilterPage(
  applications: ApplicationIdentifier[],
  domains: string[],
  input: Input,
): Output {
  const kind = input.kind ?? "all";
  const entries: FilterEntry[] = [
    ...(kind === "domains"
      ? []
      : applications.map((value): FilterEntry => ({
          kind: "application",
          value,
        }))),
    ...(kind === "applications"
      ? []
      : domains.map((value): FilterEntry => ({ kind: "domain", value }))),
  ];
  const page = pageItems(entries, input);
  const output: Output = {
    pagination: page.pagination,
    next_input: page.pagination.has_more
      ? {
          kind,
          limit: page.pagination.limit,
          offset: page.pagination.next_offset!,
        }
      : undefined,
    coverage:
      "Pagination covers every application and domain identifier returned by Coast. For kind all, applications are ordered before domains and total_count counts both kinds.",
  };
  if (kind !== "domains") {
    output.applications = page.items.flatMap((entry) =>
      entry.kind === "application" ? [entry.value] : [],
    );
  }
  if (kind !== "applications") {
    output.domains = page.items.flatMap((entry) =>
      entry.kind === "domain" ? [entry.value] : [],
    );
  }
  return output;
}

/**
 * List recorded Coast application bundle IDs and web domains. Use to resolve valid filters before search, timeline, session, or usage calls.
 */
export default async function tool(input: Input): Promise<Output> {
  if (input.kind === "applications") {
    return coastFilterPage(await listApplications(), [], input);
  }
  if (input.kind === "domains") {
    return coastFilterPage([], await listDomains(), input);
  }
  const [applications, domains] = await Promise.all([
    listApplications(),
    listDomains(),
  ]);
  return coastFilterPage(applications, domains, input);
}
