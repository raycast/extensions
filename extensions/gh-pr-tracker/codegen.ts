import type { CodegenConfig } from "@graphql-codegen/cli";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Generates typed GraphQL operations from the live GitHub schema.
 *
 * Build-time only — nothing here ships to users. Requires a `GITHUB_TOKEN` in `.env`
 * (gitignored; see `.env.example`) with `repo` read access, used solely to introspect the schema.
 *
 * Run `npm run generate` after editing any `src/**\/*.graphql` file.
 *
 * GitHub Enterprise note: the schema is introspected from github.com. GHES may lag on newer
 * fields, so anything generated here must still be checked against the minimum GHES version
 * this extension claims to support (see docs/PERFORMANCE-FINDINGS.md §5.7).
 */
const config: CodegenConfig = {
  schema: [
    {
      "https://api.github.com/graphql": {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          "User-Agent": "gh-pr-tracker-codegen",
        },
      },
    },
  ],
  documents: ["src/**/*.graphql"],
  generates: {
    "./src/generated/graphql.ts": {
      // Only operation types are generated.
      //   - `typescript` (schema types) is omitted: alongside `typescript-operations` both emit
      //     the referenced enums, producing duplicate identifiers. `preResolveTypes` makes the
      //     operation types self-contained, so it is redundant — and dropping it shrinks output.
      //   - `typescript-graphql-request` is omitted: the transport in api-graphql.ts uses plain
      //     `fetch`, so the generated SDK (and its `graphql-request` dependency) was dead weight
      //     in a Store-reviewed bundle. `documents/` supplies the query string instead.
      plugins: ["typescript-operations"],
      config: {
        // Emit only what our operations reference instead of the entire GitHub schema. The
        // official Raycast GitHub extension omits this and commits a 1.75 MB file; measure the
        // output before assuming any particular reduction (docs/PERFORMANCE-FINDINGS.md §5.4).
        onlyOperationTypes: true,
        // Inline resolved types into the operation results. Without this BOTH `typescript` and
        // `typescript-operations` emit the referenced enums, producing duplicate identifiers
        // (TS2300/TS2567) that `ray lint` does not catch but `tsc --noEmit` does.
        preResolveTypes: true,
        extractAllFieldsToTypes: false,
        // The query requests `__typename` explicitly (pr-activity.graphql), which is what actually
        // discriminates the timelineItems union — this setting is belt-and-braces, not load-bearing.
        skipTypename: false,
        // Without these, every custom scalar generates as `unknown`, forcing unsafe casts in the
        // REST-shape adapter. GitHub's IDs/dates/URIs are all strings on the wire.
        scalars: {
          DateTime: "string",
          URI: "string",
          GitObjectID: "string",
          BigInt: "string",
          HTML: "string",
        },
      },
    },
  },
  // The trailing `#` swallows the filename codegen appends to the hook command — without it,
  // `ray lint --fix` receives a stray path argument and fails.
  hooks: { afterAllFileWrite: ["npx ray lint --fix #"] },
};

export default config;
