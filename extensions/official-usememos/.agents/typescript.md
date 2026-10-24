# TypeScript

- **Exports are arrow consts**: `export const getCurrentUser = async (connection: MemosConnection) => {}`.
  Exceptions: command entry default exports (`export default SetupCommand`)
  and error classes (`class ApiError`).
- **`type` over `interface`.** Use `interface` only for declaration merging or
  module augmentation.
- **Derive types from schemas**: `type CurrentUser = z.infer<typeof currentUserSchema>`.
  Export both the schema and the type.
- **Use `satisfies`** to check a config object or lookup table without widening its type.
- **Loose absence checks only**: `== null`, `!= null`, `??`. Never branch on
  `null` vs `undefined`.
- **No `any`.** `noUncheckedIndexedAccess` is on, so handle the `undefined`.
  Use `import type` for type-only imports.
- **Add generics only when there's real reuse.** Don't parametrize something with one caller.
- **Modules are flat collections of named exports.** Use classes only for
  genuinely stateful things, like `ApiError`.
- **Imports** use relative imports without extensions: `import { memosFetch } from "./client"`.
- **`Preferences` / `Preferences.<Command>` types come from the generated
  `raycast-env.d.ts`; never hand-write them.**
