module.exports = {
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  printWidth: 80,
  proseWrap: 'never',
  endOfLine: 'lf',
  bracketSpacing: true,
  bracketSameLine: false,
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: [
    '^react$', // place React imports first
    '<THIRD_PARTY_MODULES>', // third-party modules
    '^node:', // Node builtin modules (matched by plugin pattern)
    '^@/.*$', // internal path alias - adjust if needed
    '^\.\.?(/(?!.*\.(css|less|scss)$).*)?$',
    '^.*\.(css|less|scss)$', // style files
  ],
  importOrderSeparation: true, // blank line between groups
  importOrderSortSpecifiers: true, // sort named imports
  overrides: [
    {
      files: '.prettierrc',
      options: {
        parser: 'json',
      },
    },
    {
      files: 'document.ejs',
      options: {
        parser: 'html',
      },
    },
  ],
}
