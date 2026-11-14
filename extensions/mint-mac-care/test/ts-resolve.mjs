// The extension imports its own modules without an extension, as Raycast's
// bundler expects; node needs the ".ts" to run them in the tests.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("./") && context.parentURL?.includes("/src/") && !/\.\w+$/.test(specifier)) {
    return next(`${specifier}.ts`, context);
  }
  return next(specifier, context);
}
