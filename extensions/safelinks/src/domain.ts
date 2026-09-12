import { publicSuffixRules } from './public-suffix-rules';

const rules = new Set(publicSuffixRules.split('\n'));

/** Registrable domain using the bundled ICANN + private Public Suffix List. */
export function destinationDomain(value: string): string {
	const host = new URL(value).hostname.toLowerCase().replace(/\.$/, '');
	if (host.startsWith('[') || /^\d+(\.\d+){3}$/.test(host)) return host;
	const labels = host.split('.');
	let suffixLength = 1;
	for (let i = 0; i < labels.length; i++) {
		const suffix = labels.slice(i).join('.');
		if (rules.has('!' + suffix)) return labels.slice(i).join('.');
		if (rules.has(suffix)) suffixLength = Math.max(suffixLength, labels.length - i);
		if (i > 0 && rules.has('*.' + suffix))
			suffixLength = Math.max(suffixLength, labels.length - i + 1);
	}
	return labels.slice(-suffixLength - 1).join('.');
}
