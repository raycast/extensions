import { type AuditStatus } from "./audit-json.ts";

/** What the audit screen knows about itself when it draws its title. */
export type AuditTitleState = {
	/** The counts so far, undefined until the first group reports. */
	counts?: Record<AuditStatus, number>;
	/** Whether every group has reported. */
	whole: boolean;
	/** The group still running, once the rest is on screen. */
	pending?: string;
	/** Whether a group ended in an error rather than in results. */
	failed?: boolean;
};

/**
 * The navigation title of the audit screen.
 *
 * A count is a verdict, and a verdict before every check has run is the worst
 * thing this screen could say: "0 fail" while FileVault and SIP have not been
 * looked at reads as a clean bill of health. So while a group is still running
 * the title says so instead of counting.
 *
 * A group that failed is the case that used to fall through: nothing is running
 * any more and nothing more is coming, so "still checking" would stand there for
 * as long as the screen is open. The counts are shown with what they are worth
 * written next to them - partial - and the warning row below says which group
 * could not be read.
 */
export function auditTitle({ counts, whole, pending, failed }: AuditTitleState): string {
	if (!counts) return "Security Audit";
	const tally = `${counts.pass} pass, ${counts.warn} warn, ${counts.fail} fail`;
	if (whole) return `Security Audit: ${tally}`;
	if (failed) return `Security Audit: ${tally} (partial)`;
	return `Security Audit: still checking${pending ? ` ${pending}` : ""}`;
}
