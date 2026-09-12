import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { decode, stripTrackingParams } from './decoder';
import { destinationDomain } from './domain';

const fixtures = JSON.parse(
	readFileSync(new URL('../../testdata/wrappers.json', import.meta.url), 'utf8')
);
describe('authoritative fixtures', () => {
	it('has exactly 22 cases', () => expect(fixtures.cases).toHaveLength(22));
	for (const item of fixtures.cases) {
		it(item.id, () => {
			const actual = decode(item.input);
			const expected = item.expect;
			expect(actual.ok).toBe(expected.ok);
			if (!actual.ok) {
				expect(actual.error).toBe(expected.error);
				return;
			}
			expect(actual.wrapper).toBe(expected.wrapper);
			expect(actual.decoded).toBe(expected.decoded);
			if (expected.chain_length !== undefined)
				expect(actual.chain).toHaveLength(expected.chain_length);
			for (const flag of expected.flags_include ?? []) expect(actual.flags).toContain(flag);
			for (const flag of expected.flags_exclude ?? []) expect(actual.flags).not.toContain(flag);
			expect(actual.flags).toEqual([...actual.flags].sort());
			expect(actual.chain.at(-1)).toBe(actual.decoded);
		});
	}
});

const safe = (url: string) =>
	'https://safelinks.protection.outlook.com/?url=' + encodeURIComponent(url) + '&data=tracking';
describe('normalization and wrapper boundaries', () => {
	it.each([
		['   ', { ok: false, error: 'empty-input' }],
		['nothing here', { ok: false, error: 'no-url-found' }],
		['See https://example.com/a(b)).', { decoded: 'https://example.com/a(b)' }],
		['See https://example.com/a[b]].', { decoded: 'https://example.com/a[b]' }],
		['See https://example.com/a(b.', { decoded: 'https://example.com/a(b' }],
		['“<https://example.com/a>”', { decoded: 'https://example.com/a' }],
		['https://example.com/?url=not-a-url', { wrapper: 'none' }],
		['https://example.com/?url=https://other.com', { wrapper: 'none' }],
		['https://example.com/?url=https%3a%2f%2ftarget.com%2fx', { decoded: 'https://target.com/x' }],
		['https://example.com/?url=https%3A%2F%2Ftarget.com%2Fx', { decoded: 'https://target.com/x' }],
		['https://example.com/?url=https%3A%2F%2Fa.com&u=aHR0cHM6Ly9iLmNvbQ', { wrapper: 'none' }],
		['https://example.com/?url=https%3A%2F%2Fa.com&url=https%3A%2F%2Fb.com', { wrapper: 'none' }],
		[
			'https://urldefense.proofpoint.com/v1/url?u=https%3A%2F%2Fexample.com%2Fv1',
			{ wrapper: 'proofpoint-v1', decoded: 'https://example.com/v1' }
		],
		[
			'https://sub.urldefense.com/v3/__https://example.com/a?x=1&y=2__;!!abc',
			{ decoded: 'https://example.com/a?x=1&y=2' }
		],
		[
			'https://tenant.example/?url=https%3A%2F%2Fexample.com&data=x',
			{ wrapper: 'microsoft-safelinks', decoded: 'https://example.com' }
		],
		['https://www.google.co.uk/url?q=https%3A%2F%2Fexample.com', { wrapper: 'google-redirect' }],
		['https://google.com.evil.test/url?q=https://example.com', { wrapper: 'none' }],
		['https://example.com/?url=javascript%3Aalert(1)', { wrapper: 'none' }],
		['https://safelinks.protection.outlook.com/?url=https%ZZ', { wrapper: 'none' }],
		[
			'https://example.com/?url=aHR0cHM6Ly9leGFtcGxlLmNvbS9iNjQ=',
			{ decoded: 'https://example.com/b64' }
		],
		[
			'https://example.com/?url=aHR0cHM6Ly9leGFtcGxlLmNvbS8_Pz8',
			{ decoded: 'https://example.com/???' }
		]
	])('%s', (input, expected) => expect(decode(input as string)).toMatchObject(expected));

	it('does not over-decode destination query escapes', () => {
		const target = 'https://example.com/?value=a%26b&nested=https%3A%2F%2Fexample.org';
		expect(decode(safe(target))).toMatchObject({ decoded: target });
	});
	it('bounds repeated nested wrappers at five rounds', () => {
		let input = 'https://example.com/end';
		for (let i = 0; i < 6; i++) input = safe(input);
		const result = decode(input);
		expect(result.ok && result.chain.length).toBe(6);
		expect(result.ok && result.notes.join(' ')).toContain('five');
	});
	it('retains the outermost label across mixed wrappers', () => {
		expect(
			decode(safe('https://urldefense.com/v3/__https://example.com/end__;!!abc'))
		).toMatchObject({
			wrapper: 'microsoft-safelinks',
			decoded: 'https://example.com/end',
			chain: expect.any(Array)
		});
	});
	it('shorteners remain opaque', () => {
		expect(decode(safe('https://bit.ly/?url=https%3A%2F%2Fexample.com'))).toMatchObject({
			decoded: 'https://bit.ly/?url=https%3A%2F%2Fexample.com',
			flags: ['shortener']
		});
	});
	it('decodes with the global network function disabled', () => {
		const forbidden = vi.fn(() => {
			throw new Error('network forbidden');
		});
		vi.stubGlobal('fetch', forbidden);
		try {
			expect(decode(safe('https://example.com/offline'))).toMatchObject({
				ok: true,
				decoded: 'https://example.com/offline'
			});
			expect(forbidden).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('destination risk and domain', () => {
	it('flags IPv6, userinfo, nonstandard port and HTTP in sorted order', () =>
		expect(decode('http://user:pass@[::1]:8080/')).toMatchObject({
			flags: ['ip-literal', 'nonstandard-port', 'plain-http', 'userinfo']
		}));
	it('flags unicode hosts via URL punycode normalization', () =>
		expect(decode('https://bücher.de')).toMatchObject({ flags: ['punycode'] }));
	it('does not mistake suffix attacks for shorteners', () =>
		expect(decode('https://bit.ly.evil.com')).toMatchObject({ flags: [] }));
	it('strips only tracking parameters', () =>
		expect(
			stripTrackingParams(
				'https://example.com/a?utm_source=x&id=7&gclid=y&fbclid=z&msclkid=1&mc_eid=2'
			)
		).toBe('https://example.com/a?id=7'));
	it.each([
		['https://marketing.1password.co/a', '1password.co'],
		['https://sub.example.co.uk', 'example.co.uk'],
		['https://a.user.github.io', 'user.github.io'],
		['https://a.city.kawasaki.jp', 'city.kawasaki.jp'],
		['https://a.b.ck', 'a.b.ck'],
		['https://a.www.ck', 'www.ck'],
		['https://192.168.1.1', '192.168.1.1'],
		['https://[::1]', '[::1]']
	])('registrable domain %s', (input, expected) => expect(destinationDomain(input)).toBe(expected));
});
