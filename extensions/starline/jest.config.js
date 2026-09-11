module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    setupFiles: ["<rootDir>/test/setup.ts"],
    testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
