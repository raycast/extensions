# Contributing

Hey, awesome that you want to contribute to this extension 🎉

Please read this and the related files, then happy coding!

## Documentation

Read the documentation in `DOCUMENTATION.md` and `REFERENCE.md`. Try to keep these files updated when you are contributing.

## Testing

Add unit tests for your new feature in the `src/tests` folder and any necessary helper in `src/tests/helpers`. Mocks for packages like Raycast can be added in the `__mocks__` folder.

### Temporary Vault for Testing

> Remark: This function is still quite bare right now, so you don't have to use it if you need more specific testing requirements. It would be great if you could add your use case to this method if possible (e.g. through the options parameter).

Use the `createTempVault` function to easily create a new temporary testing vautlt:

```ts
const result = createTempVault({ withBookmarks: true });

const tempVault = result.vault; // Use this in your tests
const cleanup = result.cleanup; // Run this once you are done testing, this will clean up the created vaults

const paths = result.paths; // This includes paths to the files in your vault
```

### Run Tests

```bash
yarn test
yarn coverage
```
