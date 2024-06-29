import type {Config} from '@jest/types';

const config: Config.InitialOptions = {
	verbose: true,
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	rootDir: './',
	moduleNameMapper: {
		'^src/(.*)$': '<rootDir>/src/$1',
		'^components/(.*)$': '<rootDir>/src/components/$1',
		'^services/(.*)$': '<rootDir>/src/services/$1',
		'^models/(.*)$': '<rootDir>/src/models/$1',
		'^providers/(.*)$': '<rootDir>/src/providers/$1',
		'^utils/(.*)$': '<rootDir>/src/utils/$1',
		'^tests/(.*)$': '<rootDir>/__tests__/$1',
		'^mocks/(.*)$': '<rootDir>/__tests__/mocks/$1',
		'^interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
		'^types/(.*)$': '<rootDir>/src/types/$1',
	},
	testMatch: ['<rootDir>/**/*.test.ts*'],
};

export default config;
