import raycast from '@raycast/eslint-config';

export default [
	...raycast,
	{ ignores: ['dist/**', 'raycast-env.d.ts'] },
	{
		files: ['**/*.{js,jsx,mjs,cjs}'],
		ignores: ['eslint.config.mjs'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{ selector: 'Program', message: 'Use TypeScript for repository code and configuration.' },
			],
		},
	},
];
