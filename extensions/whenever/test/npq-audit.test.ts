import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import type { AuditReport } from '../scripts/check-npq-audit.ts';

const checker = fileURLToPath(new URL('../scripts/check-npq-audit.ts', import.meta.url));

function audit(): AuditReport {
	return {
		schemaVersion: 1,
		tool: { name: 'npq', version: '3.27.0' },
		status: 'clean',
		summary: { packagesAudited: 2, errors: 0, warnings: 0 },
		packages: [
			{ requested: '@raycast/api@2.7.2', findings: [] },
			{ requested: 'typescript@6.0.3', findings: [] },
		],
		failures: [],
	};
}

function check(report: AuditReport, exitCode = 0) {
	const directory = mkdtempSync(join(tmpdir(), 'raycast-npq-'));
	try {
		writeFileSync(
			join(directory, 'package.json'),
			JSON.stringify({
				dependencies: { '@raycast/api': '2.7.2' },
				devDependencies: { typescript: '6.0.3' },
			}),
		);
		writeFileSync(join(directory, 'audit.json'), JSON.stringify(report));
		return spawnSync(process.execPath, [checker, 'audit.json', String(exitCode)], {
			cwd: directory,
			encoding: 'utf8',
		});
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

test('accepts a complete clean dependency audit', () => {
	const result = check(audit());
	assert.equal(result.status, 0, result.stderr);
});

test('allows nonblocking dependency warnings', () => {
	const report = audit();
	report.packages[0].findings.push({ severity: 'warning', message: 'Package health warning' });
	report.status = 'findings';
	report.summary.warnings = 1;
	const result = check(report, 1);
	assert.equal(result.status, 0, result.stderr);
});

test('rejects blocking dependency errors', () => {
	const report = audit();
	report.packages[0].findings.push({ severity: 'error', message: 'Known vulnerability' });
	report.status = 'findings';
	report.summary.errors = 1;
	const result = check(report, 1);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Blocking dependency audit errors/);
});

for (const [name, edit] of [
	['an operational failure', (report) => report.failures.push({ code: 'AUDIT_CHECK_FAILED' })],
	['missing package coverage', (report) => report.packages.pop()],
	['duplicate package coverage', (report) => (report.packages[1] = report.packages[0])],
	['an inconsistent summary', (report) => (report.summary.packagesAudited = 0)],
	['a changed report schema', (report) => (report.schemaVersion = 2)],
	['a changed audit tool', (report) => (report.tool.version = '3.28.0')],
	['an inconsistent report status', (report) => (report.status = 'findings')],
	[
		'an unknown severity',
		(report) =>
			report.packages[0].findings.push({ severity: 'notice', message: 'Unknown finding' }),
	],
] satisfies Array<[string, (report: AuditReport) => unknown]>) {
	test(`rejects ${name}`, () => {
		const report = audit();
		edit(report);
		assert.equal(check(report).status, 1);
	});
}

test('rejects a failed audit process even when its report claims success', () => {
	assert.equal(check(audit(), 2).status, 1);
});
