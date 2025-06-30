module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from @typescript-eslint/eslint-plugin
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier
  ],
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser for TypeScript
  parserOptions: {
    ecmaFeatures: {
      jsx: true, // Allows for the parsing of JSX
    },
    ecmaVersion: 'latest', // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  plugins: [
    'react',
    '@typescript-eslint',
    'prettier',
  ],
  rules: {
    'prettier/prettier': 'error', // Enforces Prettier formatting as ESLint errors
    'react/react-in-jsx-scope': 'off', // Disable for React 17+ JSX transform
    'react/prop-types': 'off', // Disable prop-types for TypeScript projects
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Allows inferring return types
    '@typescript-eslint/no-explicit-any': 'off', // Allows 'any' type (can be tightened later)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warns about unused vars, ignores those starting with _
    // Add any other specific rules you want to override or add
  },
  settings: {
    react: {
      version: 'detect', // Tells eslint-plugin-react to automatically detect the React version
    },
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
