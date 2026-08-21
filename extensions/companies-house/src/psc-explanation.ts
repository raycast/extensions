/**
 * Explains why a company's persons-with-significant-control register is empty.
 *
 * An empty PSC register reads as a compliance failure, and usually is not one.
 * The two ordinary explanations are a market-listing exemption — the company's
 * ownership is disclosed under market rules instead — and a statement filed in
 * place of an entry. Both are separate resources that have to be asked for, so
 * without this the extension would show a blank register and say nothing.
 *
 * Exemptions end. One that has ended is not a reason the register is empty
 * *now*, and reporting it as current would tell a reader a company is
 * legitimately exempt when in fact it lost the exemption and stopped filing.
 * Statements are withdrawn the same way, via `ceased_on`. Both are therefore
 * read for their dates rather than their mere presence.
 */

import { getExemptions, getPscStatements } from "./api";
import { exemptionLabel, formatDate, pscStatementLabel } from "./helpers";
import type { PscStatementItem } from "./types";

/** The exemption keys that bear on the PSC register specifically. */
const PSC_EXEMPTION_KEYS = [
  "psc_exempt_as_trading_on_regulated_market",
  "psc_exempt_as_trading_on_uk_regulated_market",
  "psc_exempt_as_trading_on_eu_regulated_market",
  "psc_exempt_as_shares_admitted_on_market",
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface PscExemption {
  type: string;
  exemptFrom?: string;
  exemptTo?: string;
  /** True while no end date has passed. */
  current: boolean;
}

export interface PscExplanation {
  /** True only when at least one PSC exemption is still in force. */
  exempt: boolean;
  currentExemptions: PscExemption[];
  endedExemptions: PscExemption[];
  activeStatements: PscStatementItem[];
  withdrawnStatements: PscStatementItem[];
  /** True when nothing on the register accounts for the absence. */
  unexplained: boolean;
}

function isCurrent(period: { exempt_to?: string }, now: number): boolean {
  if (!period.exempt_to) return true;
  const endsAt = new Date(period.exempt_to);
  // An end date that cannot be read is treated as ended. Guessing the other
  // way would report a company as exempt on the strength of a value nobody
  // could parse.
  if (Number.isNaN(endsAt.getTime())) return false;
  // Companies House dates are calendar dates, so an exemption ending today is
  // in force for the whole of today.
  return endsAt.getTime() + DAY_IN_MS > now;
}

/**
 * Reads the exemptions and statements resources for a company. Both 404 when
 * there is nothing to report, which the API layer turns into `undefined`.
 *
 * A rejection here is therefore a real failure — a bad key, a rate limit, an
 * outage — never an absence. It is allowed to propagate so the caller can show
 * it. Swallowing it would report "nothing has been filed" about a register
 * nobody managed to read, which is the same error as showing a failure toast
 * for a genuine absence, just pointing the other way.
 */
export async function explainAbsentPscs(
  companyNumber: string,
  now: number = Date.now(),
): Promise<PscExplanation> {
  const [exemptionsResponse, statementsResponse] = await Promise.all([
    getExemptions(companyNumber),
    getPscStatements(companyNumber, 0),
  ]);

  const exemptions: PscExemption[] = [];
  if (exemptionsResponse) {
    const entries = Object.entries(exemptionsResponse.exemptions ?? {});
    for (const [key, value] of entries) {
      if (!PSC_EXEMPTION_KEYS.includes(key)) continue;
      const type = value.exemption_type ?? key.replace(/_/g, "-");
      const periods = value.items ?? [];
      if (!periods.length) {
        // No dates at all: nothing on record says it has ended.
        exemptions.push({ type, current: true });
        continue;
      }
      for (const period of periods) {
        exemptions.push({
          type,
          exemptFrom: period.exempt_from,
          exemptTo: period.exempt_to,
          current: isCurrent(period, now),
        });
      }
    }
  }

  const statements = statementsResponse?.items ?? [];

  const currentExemptions = exemptions.filter((exemption) => exemption.current);
  const endedExemptions = exemptions.filter((exemption) => !exemption.current);
  const activeStatements = statements.filter(
    (statement) => !statement.ceased_on,
  );
  const withdrawnStatements = statements.filter((statement) =>
    Boolean(statement.ceased_on),
  );

  return {
    exempt: currentExemptions.length > 0,
    currentExemptions,
    endedExemptions,
    activeStatements,
    withdrawnStatements,
    // True only when the register holds nothing at all that bears on the
    // absence. A lapsed exemption or a withdrawn statement is still a record,
    // and claiming "nothing has been filed" directly beneath a list of what
    // was filed contradicts the very section above it.
    unexplained:
      currentExemptions.length === 0 &&
      activeStatements.length === 0 &&
      endedExemptions.length === 0 &&
      withdrawnStatements.length === 0,
  };
}

/**
 * One line per exemption, with the dates that decide whether it still applies.
 *
 * Companies House writes its exemption text as a complete sentence ending in a
 * full stop, so the dates go after it in brackets rather than being run on to
 * the end of it.
 */
export function describeExemption(exemption: PscExemption): string {
  const label = (exemptionLabel(exemption.type) ?? exemption.type).replace(
    /\.$/,
    "",
  );
  const period = [
    exemption.exemptFrom
      ? `from ${formatDate(exemption.exemptFrom)}`
      : undefined,
    exemption.exemptTo ? `to ${formatDate(exemption.exemptTo)}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  return period ? `${label} (${period})` : label;
}

/**
 * A single sentence saying why the register is empty, for a heading or a list
 * subtitle. The detail lives in `explanationMarkdown`.
 */
export function explanationSummary(explanation: PscExplanation): string {
  if (explanation.exempt) {
    return "The company is exempt from the PSC requirements.";
  }
  if (explanation.activeStatements.length) {
    return "A statement has been filed in place of a PSC entry.";
  }
  if (explanation.endedExemptions.length) {
    return "The company held a PSC exemption, but it has ended.";
  }
  if (explanation.withdrawnStatements.length) {
    return "A statement was filed in place of a PSC entry, but it has been withdrawn.";
  }
  return "No exemption and no statement explain the empty register.";
}

/** The full explanation, as markdown for a detail pane or a tool result. */
export function explanationMarkdown(explanation: PscExplanation): string {
  const lines: string[] = [];

  if (explanation.exempt) {
    lines.push(
      "The company is recorded as currently exempt from the PSC requirements. That normally applies to a company whose shares trade on a regulated market and whose ownership is disclosed under market rules instead.",
      "",
      "**Exemptions in force**",
      "",
      ...explanation.currentExemptions.map(
        (exemption) => `- ${describeExemption(exemption)}`,
      ),
      "",
    );
  } else if (explanation.endedExemptions.length) {
    lines.push(
      "The company held a PSC exemption, but it has ended, so the company is not exempt now.",
      "",
    );
  }

  if (!explanation.exempt && explanation.endedExemptions.length) {
    lines.push(
      "**Exemptions on record, no longer in force**",
      "",
      ...explanation.endedExemptions.map(
        (exemption) => `- ${describeExemption(exemption)}`,
      ),
      "",
    );
  }

  if (explanation.activeStatements.length) {
    lines.push("**Statements filed in place of an entry**", "");
    for (const statement of explanation.activeStatements) {
      const notified = statement.notified_on
        ? ` (notified ${formatDate(statement.notified_on)})`
        : "";
      lines.push(`- ${pscStatementLabel(statement.statement)}${notified}`);
    }
    lines.push("");
  }

  if (explanation.withdrawnStatements.length) {
    lines.push("**Statements since withdrawn**", "");
    for (const statement of explanation.withdrawnStatements) {
      const ceased = statement.ceased_on
        ? ` (withdrawn ${formatDate(statement.ceased_on)})`
        : "";
      lines.push(`- ${pscStatementLabel(statement.statement)}${ceased}`);
    }
    lines.push("");
  }

  if (explanation.unexplained) {
    lines.push(
      "No exemption is in force and no statement has been filed in place of an entry. The company may simply not have filed its PSC information. This is an absence of data, not evidence about who controls the company.",
      "",
    );
  }

  return lines.join("\n");
}
