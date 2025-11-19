module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/test/**/*',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	transform: {
		'^.+\\.(t|j)sx?$': ['ts-jest', {
			tsconfig: {
				target: 'es2022',
				lib: ['es2022', 'dom'],
				skipLibCheck: true,
			},
		}],
	},
};
