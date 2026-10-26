import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export type AuditReport = {
	schemaVersion: number;
	tool: { name: string; version: string };
	status: string;
	summary: { packagesAudited: number; errors: number; warnings: number };
	packages: Array<{ requested: string; findings: Array<{ severity: string; message: string }> }>;
	failures: unknown[];
};

type Manifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

try {
	const report: AuditReport = JSON.parse(readFileSync(process.argv[2], 'utf8'));
	const manifest: Manifest = JSON.parse(readFileSync('package.json', 'utf8'));
	const exitCode = Number(process.argv[3]);
	assert.equal(report.schemaVersion, 1, 'Unexpected npq report schema');
	assert.deepEqual(report.tool, { name: 'npq', version: '3.27.0' }, 'Unexpected audit tool');
	assert.deepEqual(report.failures, [], 'The dependency audit did not complete');

	const expected = [
		...Object.entries(manifest.dependencies ?? {}),
		...Object.entries(manifest.devDependencies ?? {}),
	]
		.map(([name, version]) => `${name}@${version}`)
		.sort();
	assert.deepEqual(
		report.packages.map((pkg) => pkg.requested).sort(),
		expected,
		'The audit must cover each declared dependency exactly once',
	);
	const findings = report.packages.flatMap((pkg) =>
		pkg.findings.map((finding) => ({ ...finding, requested: pkg.requested })),
	);
	assert.ok(
		findings.every((finding) => finding.severity === 'error' || finding.severity === 'warning'),
		'Unknown audit severity',
	);
	const errors = findings.filter((finding) => finding.severity === 'error');
	const warnings = findings.filter((finding) => finding.severity === 'warning');
	assert.deepEqual(
		report.summary,
		{
			packagesAudited: expected.length,
			errors: errors.length,
			warnings: warnings.length,
		},
		'Inconsistent audit summary',
	);
	const status = findings.length === 0 ? 'clean' : 'findings';
	assert.equal(report.status, status, 'Inconsistent audit status');
	assert.equal(exitCode, status === 'clean' ? 0 : 1, 'Unexpected audit process exit');

	assert.deepEqual(errors, [], 'Blocking dependency audit errors');
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
