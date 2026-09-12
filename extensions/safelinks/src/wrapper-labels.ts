import type { Wrapper } from './decoder';
export const wrapperLabels: Record<Wrapper, { label: string; subtitle: string }> = {
	'microsoft-safelinks': {
		label: 'Microsoft Safe Links',
		subtitle: 'Microsoft Defender email wrapper'
	},
	'proofpoint-v3': { label: 'Proofpoint v3', subtitle: 'URL Defense path wrapper' },
	'proofpoint-v2': { label: 'Proofpoint v2', subtitle: 'URL Defense encoded parameter' },
	'proofpoint-v1': { label: 'Proofpoint v1', subtitle: 'URL Defense URL parameter' },
	'google-redirect': { label: 'Google redirect', subtitle: 'Google outbound URL wrapper' },
	'generic-url-param': {
		label: 'Generic URL parameter',
		subtitle: 'Heuristic redirect parameter, not a vendor wrapper'
	},
	none: { label: 'Not wrapped', subtitle: 'The original URL is the destination' }
};
