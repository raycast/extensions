// The engine, declared as a package.
//
// `seo-audit` ships plain ESM with no type declarations, deliberately: the
// command line's premise is that it runs under `npx` with nothing installed,
// and emitting types would mean a build step. TypeScript will infer from
// JavaScript inside the project, but not from JavaScript inside node_modules,
// so without this the extension does not compile once the engine is a
// dependency rather than a relative path.
//
// These are intentionally untyped. `lib/engine.ts` is the one place that says
// what the engine returns, and it says so with assertions it explains. Two
// files describing the same shapes would be two files to keep in step.

declare module "@nurkamol/seo-audit";
declare module "@nurkamol/seo-audit/causes";
declare module "@nurkamol/seo-audit/report";
declare module "@nurkamol/seo-audit/sitemap";
declare module "@nurkamol/seo-audit/areas";
declare module "@nurkamol/seo-audit/agents";
