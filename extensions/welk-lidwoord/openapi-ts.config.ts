import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
	input: process.env.OPENAPI_URL || 'http://localhost:8806/openapi.json',
	output: 'src/api',
	plugins: [
		{
			name: '@hey-api/client-fetch',
			runtimeConfigPath: './src/hey-api',
		},
		'@hey-api/typescript',
		'@hey-api/sdk',
	],
});
