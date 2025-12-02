import { BiomeRule } from "../types/biome-schema";

export const biomeRulesFallback: BiomeRule[] = [
  {
    id: "noForIn",
    name: "no-for-in",
    category: "Nursery",
    description:
      "Disallow iterating using a for-in loop.\nSee https://biomejs.dev/linter/rules/no-for-in",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-for-in/",
  },
  {
    id: "noSyncScripts",
    name: "no-sync-scripts",
    category: "Nursery",
    description:
      "Prevent the usage of synchronous scripts.\nSee https://biomejs.dev/linter/rules/no-sync-scripts",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-sync-scripts/",
  },
  {
    id: "noVueVIfWithVFor",
    name: "no-vue-vif-with-vfor",
    category: "Nursery",
    description:
      "Disallow using v-if and v-for directives on the same element.\nSee https://biomejs.dev/linter/rules/no-vue-v-if-with-v-for",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-vue-vif-with-vfor/",
  },
  {
    id: "useConsistentGraphqlDescriptions",
    name: "use-consistent-graphql-descriptions",
    category: "Nursery",
    description:
      "Require all descriptions to follow the same style (either block or inline) to  maintain consistency and improve readability across the schema.\nSee https://biomejs.dev/linter/rules/use-consistent-graphql-descriptions",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-consistent-graphql-descriptions/",
  },
  {
    id: "useFind",
    name: "use-find",
    category: "Nursery",
    description:
      "Enforce the use of Array.prototype.find() over Array.prototype.filter() followed by [0] when looking for a single result.\nSee https://biomejs.dev/linter/rules/use-find",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-find/",
  },
  {
    id: "useSpread",
    name: "use-spread",
    category: "Nursery",
    description:
      "Enforce the use of the spread operator over .apply().\nSee https://biomejs.dev/linter/rules/use-spread",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-spread/",
  },
  {
    id: "useUniqueGraphqlOperationName",
    name: "use-unique-graphql-operation-name",
    category: "Nursery",
    description:
      "Enforce unique operation names across a GraphQL document.\nSee https://biomejs.dev/linter/rules/use-unique-graphql-operation-name",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-unique-graphql-operation-name/",
  },
  {
    id: "useVueHyphenatedAttributes",
    name: "use-vue-hyphenated-attributes",
    category: "Nursery",
    description:
      "Enforce hyphenated (kebab-case) attribute names in Vue templates.\nSee https://biomejs.dev/linter/rules/use-vue-hyphenated-attributes",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-vue-hyphenated-attributes/",
  },
  {
    id: "useVueValidVBind",
    name: "use-vue-valid-vbind",
    category: "Nursery",
    description:
      "Forbids v-bind directives with missing arguments or invalid modifiers.\nSee https://biomejs.dev/linter/rules/use-vue-valid-v-bind",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-vue-valid-vbind/",
  },
  {
    id: "useVueValidVElse",
    name: "use-vue-valid-velse",
    category: "Nursery",
    description:
      "Enforce valid usage of v-else.\nSee https://biomejs.dev/linter/rules/use-vue-valid-v-else",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-vue-valid-velse/",
  },
  {
    id: "useVueValidVElseIf",
    name: "use-vue-valid-velse-if",
    category: "Nursery",
    description:
      "Enforce valid v-else-if directives.\nSee https://biomejs.dev/linter/rules/use-vue-valid-v-else-if",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-vue-valid-velse-if/",
  },
  {
    id: "useVueValidVHtml",
    name: "use-vue-valid-vhtml",
    category: "Nursery",
    description:
      "Enforce valid v-html directives.\nSee https://biomejs.dev/linter/rules/use-vue-valid-v-html",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-vue-valid-vhtml/",
  },
  {
    id: "useVueValidVIf",
    name: "use-vue-valid-vif",
    category: "Nursery",
    description:
      "Enforces valid v-if usage for Vue templates.\nSee https://biomejs.dev/linter/rules/use-vue-valid-v-if",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-vue-valid-vif/",
  },
  {
    id: "useVueValidVOn",
    name: "use-vue-valid-von",
    category: "Nursery",
    description:
      "Enforce valid v-on directives with proper arguments, modifiers, and handlers.\nSee https://biomejs.dev/linter/rules/use-vue-valid-v-on",
    recommended: false,
    fixable: false,
    version: "2.3.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-vue-valid-von/",
  },
  {
    id: "useArraySortCompare",
    name: "use-array-sort-compare",
    category: "Nursery",
    description:
      "Require Array#sort and Array#toSorted calls to always provide a compareFunction.\nSee https://biomejs.dev/linter/rules/use-array-sort-compare",
    recommended: false,
    fixable: false,
    version: "2.3.5",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-array-sort-compare/",
  },
  {
    id: "noContinue",
    name: "no-continue",
    category: "Nursery",
    description:
      "Disallow continue statements.\nSee https://biomejs.dev/linter/rules/no-continue",
    recommended: false,
    fixable: false,
    version: "2.3.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-continue/",
  },
  {
    id: "noParametersOnlyUsedInRecursion",
    name: "no-parameters-only-used-in-recursion",
    category: "Nursery",
    description:
      "Disallow function parameters that are only used in recursive calls.\nSee https://biomejs.dev/linter/rules/no-parameters-only-used-in-recursion",
    recommended: false,
    fixable: false,
    version: "2.3.3",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/no-parameters-only-used-in-recursion/",
  },
  {
    id: "noUnknownAttribute",
    name: "no-unknown-attribute",
    category: "Nursery",
    description:
      "Disallow unknown DOM properties.\nSee https://biomejs.dev/linter/rules/no-unknown-attribute",
    recommended: false,
    fixable: false,
    version: "2.3.3",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-unknown-attribute/",
  },
  {
    id: "noIncrementDecrement",
    name: "no-increment-decrement",
    category: "Nursery",
    description:
      "Disallows the usage of the unary operators ++ and --.\nSee https://biomejs.dev/linter/rules/no-increment-decrement",
    recommended: false,
    fixable: false,
    version: "2.3.2",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-increment-decrement/",
  },
  {
    id: "useVueDefineMacrosOrder",
    name: "use-vue-define-macros-order",
    category: "Nursery",
    description:
      "Enforce specific order of Vue compiler macros.\nSee https://biomejs.dev/linter/rules/use-vue-define-macros-order",
    recommended: false,
    fixable: false,
    version: "2.3.0",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-vue-define-macros-order/",
  },
  {
    id: "noEmptySource",
    name: "no-empty-source",
    category: "Nursery",
    description:
      "Disallow empty sources.\nSee https://biomejs.dev/linter/rules/no-empty-source",
    recommended: false,
    fixable: false,
    version: "2.2.7",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-empty-source/",
  },
  {
    id: "useDeprecatedDate",
    name: "use-deprecated-date",
    category: "Nursery",
    description:
      "Require the @deprecated directive to specify a deletion date.\nSee https://biomejs.dev/linter/rules/use-deprecated-date",
    recommended: false,
    fixable: false,
    version: "2.2.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-deprecated-date/",
  },
  {
    id: "useQwikMethodUsage",
    name: "use-qwik-method-usage",
    category: "Nursery",
    description:
      "Disallow use* hooks outside of component$ or other use* hooks in Qwik applications.\nSee https://biomejs.dev/linter/rules/use-qwik-method-usage",
    recommended: false,
    fixable: false,
    version: "2.2.6",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-qwik-method-usage/",
  },
  {
    id: "useQwikValidLexicalScope",
    name: "use-qwik-valid-lexical-scope",
    category: "Nursery",
    description:
      "Disallow unserializable expressions in Qwik dollar ($) scopes.\nSee https://biomejs.dev/linter/rules/use-qwik-valid-lexical-scope",
    recommended: false,
    fixable: false,
    version: "2.2.6",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-qwik-valid-lexical-scope/",
  },
  {
    id: "noDeprecatedImports",
    name: "no-deprecated-imports",
    category: "Nursery",
    description:
      "Restrict imports of deprecated exports.\nSee https://biomejs.dev/linter/rules/no-deprecated-imports",
    recommended: false,
    fixable: false,
    version: "2.2.5",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-deprecated-imports/",
  },
  {
    id: "noReactForwardRef",
    name: "no-react-forward-ref",
    category: "Nursery",
    description:
      "Replaces usages of forwardRef with passing ref as a prop.\nSee https://biomejs.dev/linter/rules/no-react-forward-ref",
    recommended: false,
    fixable: false,
    version: "2.2.5",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-react-forward-ref/",
  },
  {
    id: "noUnusedExpressions",
    name: "no-unused-expressions",
    category: "Nursery",
    description:
      "Disallow expression statements that are neither a function call nor an assignment.\nSee https://biomejs.dev/linter/rules/no-unused-expressions",
    recommended: false,
    fixable: false,
    version: "2.2.5",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-unused-expressions/",
  },
  {
    id: "noVueDuplicateKeys",
    name: "no-vue-duplicate-keys",
    category: "Nursery",
    description:
      "Disallow duplicate keys in Vue component data, methods, computed properties, and other options.\nSee https://biomejs.dev/linter/rules/no-vue-duplicate-keys",
    recommended: false,
    fixable: false,
    version: "2.2.5",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-vue-duplicate-keys/",
  },
  {
    id: "noDuplicateDependencies",
    name: "no-duplicate-dependencies",
    category: "Nursery",
    description:
      'Prevent the listing of duplicate dependencies. The rule supports the following dependency groups: "bundledDependencies", "bundleDependencies", "dependencies", "devDependencies", "overrides", "optionalDependencies", and "peerDependencies".\nSee https://biomejs.dev/linter/rules/no-duplicate-dependencies',
    recommended: false,
    fixable: false,
    version: "2.2.4",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/no-duplicate-dependencies/",
  },
  {
    id: "noJsxLiterals",
    name: "no-jsx-literals",
    category: "Nursery",
    description:
      "Disallow string literals inside JSX elements.\nSee https://biomejs.dev/linter/rules/no-jsx-literals",
    recommended: false,
    fixable: false,
    version: "2.2.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-jsx-literals/",
  },
  {
    id: "noUselessCatchBinding",
    name: "no-useless-catch-binding",
    category: "Nursery",
    description:
      "Disallow unused catch bindings.\nSee https://biomejs.dev/linter/rules/no-useless-catch-binding",
    recommended: false,
    fixable: false,
    version: "2.2.3",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/no-useless-catch-binding/",
  },
  {
    id: "useConsistentArrowReturn",
    name: "use-consistent-arrow-return",
    category: "Nursery",
    description:
      "Enforce consistent arrow function bodies.\nSee https://biomejs.dev/linter/rules/use-consistent-arrow-return",
    recommended: false,
    fixable: false,
    version: "2.2.3",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-consistent-arrow-return/",
  },
  {
    id: "useVueMultiWordComponentNames",
    name: "use-vue-multi-word-component-names",
    category: "Nursery",
    description:
      "Enforce multi-word component names in Vue components.\nSee https://biomejs.dev/linter/rules/use-vue-multi-word-component-names",
    recommended: false,
    fixable: false,
    version: "2.2.3",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-vue-multi-word-component-names/",
  },
  {
    id: "noAwaitInLoops",
    name: "no-await-in-loops",
    category: "Performance",
    description:
      "Disallow await inside loops.\nSee https://biomejs.dev/linter/rules/no-await-in-loops",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl: "https://biomejs.dev/linter/rules/performance/no-await-in-loops/",
  },
  {
    id: "noBiomeFirstException",
    name: "no-biome-first-exception",
    category: "Suspicious",
    description:
      "Prevents the use of the ! pattern in the first position of files.includes in the configuration file.\nSee https://biomejs.dev/linter/rules/no-biome-first-exception",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-biome-first-exception/",
  },
  {
    id: "noConstantBinaryExpressions",
    name: "no-constant-binary-expressions",
    category: "Suspicious",
    description:
      "Disallow expressions where the operation doesn't affect the value.\nSee https://biomejs.dev/linter/rules/no-constant-binary-expressions",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-constant-binary-expressions/",
  },
  {
    id: "noImplicitCoercions",
    name: "no-implicit-coercions",
    category: "Complexity",
    description:
      "Disallow shorthand type conversions.\nSee https://biomejs.dev/linter/rules/no-implicit-coercions",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-implicit-coercions/",
  },
  {
    id: "noNextAsyncClientComponent",
    name: "no-next-async-client-component",
    category: "Nursery",
    description:
      "Prevent client components from being async functions.\nSee https://biomejs.dev/linter/rules/no-next-async-client-component",
    recommended: false,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/no-next-async-client-component/",
  },
  {
    id: "noReactPropAssignments",
    name: "no-react-prop-assignments",
    category: "Correctness",
    description:
      "Disallow assigning to React component props.\nSee https://biomejs.dev/linter/rules/no-react-prop-assignments",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-react-prop-assignments/",
  },
  {
    id: "noSolidDestructuredProps",
    name: "no-solid-destructured-props",
    category: "Correctness",
    description:
      "Disallow destructuring props inside JSX components in Solid projects.\nSee https://biomejs.dev/linter/rules/no-solid-destructured-props",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-solid-destructured-props/",
  },
  {
    id: "noUnknownAtRules",
    name: "no-unknown-at-rules",
    category: "Suspicious",
    description:
      "Disallow unknown at-rules.\nSee https://biomejs.dev/linter/rules/no-unknown-at-rules",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-unknown-at-rules/",
  },
  {
    id: "noUselessRegexBackrefs",
    name: "no-useless-regex-backrefs",
    category: "Suspicious",
    description:
      "Disallow useless backreferences in regular expression literals that always match an empty string.\nSee https://biomejs.dev/linter/rules/no-useless-regex-backrefs",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-useless-regex-backrefs/",
  },
  {
    id: "useBiomeIgnoreFolder",
    name: "use-biome-ignore-folder",
    category: "Suspicious",
    description:
      "Promotes the correct usage for ignoring folders in the configuration file.\nSee https://biomejs.dev/linter/rules/use-biome-ignore-folder",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-biome-ignore-folder/",
  },
  {
    id: "useConsistentObjectDefinitions",
    name: "use-consistent-object-definitions",
    category: "Style",
    description:
      "Require the consistent declaration of object literals. Defaults to explicit definitions.\nSee https://biomejs.dev/linter/rules/use-consistent-object-definitions",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-consistent-object-definitions/",
  },
  {
    id: "useGraphqlNamedOperations",
    name: "use-graphql-named-operations",
    category: "Correctness",
    description:
      "Enforce specifying the name of GraphQL operations.\nSee https://biomejs.dev/linter/rules/use-graphql-named-operations",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-graphql-named-operations/",
  },
  {
    id: "useGraphqlNamingConvention",
    name: "use-graphql-naming-convention",
    category: "Style",
    description:
      "Validates that all enum values are capitalized.\nSee https://biomejs.dev/linter/rules/use-graphql-naming-convention",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-graphql-naming-convention/",
  },
  {
    id: "useGroupedAccessorPairs",
    name: "use-grouped-accessor-pairs",
    category: "Style",
    description:
      "Enforce that getters and setters for the same property are adjacent in class and object definitions.\nSee https://biomejs.dev/linter/rules/use-grouped-accessor-pairs",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-grouped-accessor-pairs/",
  },
  {
    id: "useJsonImportAttributes",
    name: "use-json-import-attributes",
    category: "Correctness",
    description:
      'Enforces the use of with { type: "json" } for JSON module imports.\nSee https://biomejs.dev/linter/rules/use-json-import-attributes',
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-json-import-attributes/",
  },
  {
    id: "useMaxParams",
    name: "use-max-params",
    category: "Nursery",
    description:
      "Enforce a maximum number of parameters in function definitions.\nSee https://biomejs.dev/linter/rules/use-max-params",
    recommended: false,
    fixable: false,
    version: "2.2.0",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-max-params/",
  },
  {
    id: "useSolidForComponent",
    name: "use-solid-for-component",
    category: "Performance",
    description:
      "Enforce using Solid's \\<For /> component for mapping an array to JSX elements.\nSee https://biomejs.dev/linter/rules/use-solid-for-component",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/performance/use-solid-for-component/",
  },
  {
    id: "useStaticResponseMethods",
    name: "use-static-response-methods",
    category: "Suspicious",
    description:
      "Use static Response methods instead of new Response() constructor when possible.\nSee https://biomejs.dev/linter/rules/use-static-response-methods",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-static-response-methods/",
  },
  {
    id: "useUnifiedTypeSignatures",
    name: "use-unified-type-signatures",
    category: "Style",
    description:
      "Disallow overload signatures that can be unified into a single signature.\nSee https://biomejs.dev/linter/rules/use-unified-type-signatures",
    recommended: true,
    fixable: false,
    version: "2.2.0",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-unified-type-signatures/",
  },
  {
    id: "noNonNullAssertedOptionalChain",
    name: "no-non-null-asserted-optional-chain",
    category: "Suspicious",
    description:
      "Disallow non-null assertions after optional chaining expressions.\nSee https://biomejs.dev/linter/rules/no-non-null-asserted-optional-chain",
    recommended: true,
    fixable: false,
    version: "2.1.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-non-null-asserted-optional-chain/",
  },
  {
    id: "noQwikUseVisibleTask",
    name: "no-qwik-use-visible-task",
    category: "Correctness",
    description:
      "Disallow useVisibleTask$() functions in Qwik components.\nSee https://biomejs.dev/linter/rules/no-qwik-use-visible-task",
    recommended: true,
    fixable: false,
    version: "2.1.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-qwik-use-visible-task/",
  },
  {
    id: "noUnnecessaryConditions",
    name: "no-unnecessary-conditions",
    category: "Nursery",
    description:
      "Disallow unnecessary type-based conditions that can be statically determined as redundant.\nSee https://biomejs.dev/linter/rules/no-unnecessary-conditions",
    recommended: false,
    fixable: false,
    version: "2.1.4",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/no-unnecessary-conditions/",
  },
  {
    id: "noVueDataObjectDeclaration",
    name: "no-vue-data-object-declaration",
    category: "Nursery",
    description:
      "Enforce that Vue component data options are declared as functions.\nSee https://biomejs.dev/linter/rules/no-vue-data-object-declaration",
    recommended: false,
    fixable: false,
    version: "2.1.4",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/no-vue-data-object-declaration/",
  },
  {
    id: "noVueReservedKeys",
    name: "no-vue-reserved-keys",
    category: "Nursery",
    description:
      "Disallow reserved keys in Vue component data and computed properties.\nSee https://biomejs.dev/linter/rules/no-vue-reserved-keys",
    recommended: false,
    fixable: false,
    version: "2.1.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-vue-reserved-keys/",
  },
  {
    id: "useConsistentTypeDefinitions",
    name: "use-consistent-type-definitions",
    category: "Style",
    description:
      "Enforce type definitions to consistently use either interface or type.\nSee https://biomejs.dev/linter/rules/use-consistent-type-definitions",
    recommended: true,
    fixable: false,
    version: "2.1.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-consistent-type-definitions/",
  },
  {
    id: "useImageSize",
    name: "use-image-size",
    category: "Correctness",
    description:
      "Enforces that \\<img> elements have both width and height attributes.\nSee https://biomejs.dev/linter/rules/use-image-size",
    recommended: true,
    fixable: false,
    version: "2.1.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/use-image-size/",
  },
  {
    id: "useQwikClasslist",
    name: "use-qwik-classlist",
    category: "Correctness",
    description:
      "Prefer using the class prop as a classlist over the classnames helper.\nSee https://biomejs.dev/linter/rules/use-qwik-classlist",
    recommended: true,
    fixable: false,
    version: "2.1.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/use-qwik-classlist/",
  },
  {
    id: "useReactFunctionComponents",
    name: "use-react-function-components",
    category: "Style",
    description:
      "Enforce that components are defined as functions and never as classes.\nSee https://biomejs.dev/linter/rules/use-react-function-components",
    recommended: true,
    fixable: false,
    version: "2.1.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-react-function-components/",
  },
  {
    id: "noQuickfixBiome",
    name: "no-quickfix-biome",
    category: "Suspicious",
    description:
      "Disallow the use if quickfix.biome inside editor settings file.\nSee https://biomejs.dev/linter/rules/no-quickfix-biome",
    recommended: true,
    fixable: false,
    version: "2.1.3",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-quickfix-biome/",
  },
  {
    id: "noVueReservedProps",
    name: "no-vue-reserved-props",
    category: "Nursery",
    description:
      "Disallow reserved names to be used as props.\nSee https://biomejs.dev/linter/rules/no-vue-reserved-props",
    recommended: false,
    fixable: false,
    version: "2.1.2",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-vue-reserved-props/",
  },
  {
    id: "noMagicNumbers",
    name: "no-magic-numbers",
    category: "Style",
    description:
      'Reports usage of "magic numbers" — numbers used directly instead of being assigned to named constants.\nSee https://biomejs.dev/linter/rules/no-magic-numbers',
    recommended: true,
    fixable: false,
    version: "2.1.0",
    docUrl: "https://biomejs.dev/linter/rules/style/no-magic-numbers/",
  },
  {
    id: "noMisusedPromises",
    name: "no-misused-promises",
    category: "Nursery",
    description:
      "Disallow Promises to be used in places where they are almost certainly a mistake.\nSee https://biomejs.dev/linter/rules/no-misused-promises",
    recommended: false,
    fixable: false,
    version: "2.1.0",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-misused-promises/",
  },
  {
    id: "noAlert",
    name: "no-alert",
    category: "Suspicious",
    description:
      "Disallow the use of alert, confirm, and prompt.\nSee https://biomejs.dev/linter/rules/no-alert",
    recommended: true,
    fixable: false,
    version: "2.0.6",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-alert/",
  },
  {
    id: "noExcessiveLinesPerFunction",
    name: "no-excessive-lines-per-function",
    category: "Complexity",
    description:
      "Restrict the number of lines of code in a function.\nSee https://biomejs.dev/linter/rules/no-excessive-lines-per-function",
    recommended: true,
    fixable: false,
    version: "2.0.6",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-excessive-lines-per-function/",
  },
  {
    id: "noUnassignedVariables",
    name: "no-unassigned-variables",
    category: "Suspicious",
    description:
      "Disallow let or var variables that are read but never assigned.\nSee https://biomejs.dev/linter/rules/no-unassigned-variables",
    recommended: true,
    fixable: false,
    version: "2.0.6",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-unassigned-variables/",
  },
  {
    id: "noAccessKey",
    name: "no-access-key",
    category: "A11y",
    description:
      "Enforce that the accessKey attribute is not used on any HTML element.\nSee https://biomejs.dev/linter/rules/no-access-key",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-access-key/",
  },
  {
    id: "noAccumulatingSpread",
    name: "no-accumulating-spread",
    category: "Performance",
    description:
      "Disallow the use of spread (...) syntax on accumulators.\nSee https://biomejs.dev/linter/rules/no-accumulating-spread",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/performance/no-accumulating-spread/",
  },
  {
    id: "noAdjacentSpacesInRegex",
    name: "no-adjacent-spaces-in-regex",
    category: "Complexity",
    description:
      "Disallow unclear usage of consecutive space characters in regular expression literals.\nSee https://biomejs.dev/linter/rules/no-adjacent-spaces-in-regex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-adjacent-spaces-in-regex/",
  },
  {
    id: "noApproximativeNumericConstant",
    name: "no-approximative-numeric-constant",
    category: "Suspicious",
    description:
      "Use standard constants instead of approximated literals.\nSee https://biomejs.dev/linter/rules/no-approximative-numeric-constant",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-approximative-numeric-constant/",
  },
  {
    id: "noArguments",
    name: "no-arguments",
    category: "Complexity",
    description:
      "Disallow the use of arguments.\nSee https://biomejs.dev/linter/rules/no-arguments",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-arguments/",
  },
  {
    id: "noAriaHiddenOnFocusable",
    name: "no-aria-hidden-on-focusable",
    category: "A11y",
    description:
      'Enforce that aria-hidden="true" is not set on focusable elements.\nSee https://biomejs.dev/linter/rules/no-aria-hidden-on-focusable',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/no-aria-hidden-on-focusable/",
  },
  {
    id: "noAriaUnsupportedElements",
    name: "no-aria-unsupported-elements",
    category: "A11y",
    description:
      "Enforce that elements that do not support ARIA roles, states, and properties do not have those attributes.\nSee https://biomejs.dev/linter/rules/no-aria-unsupported-elements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/no-aria-unsupported-elements/",
  },
  {
    id: "noArrayIndexKey",
    name: "no-array-index-key",
    category: "Suspicious",
    description:
      "Discourage the usage of Array index in keys.\nSee https://biomejs.dev/linter/rules/no-array-index-key",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-array-index-key/",
  },
  {
    id: "noAssignInExpressions",
    name: "no-assign-in-expressions",
    category: "Suspicious",
    description:
      "Disallow assignments in expressions.\nSee https://biomejs.dev/linter/rules/no-assign-in-expressions",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-assign-in-expressions/",
  },
  {
    id: "noAsyncPromiseExecutor",
    name: "no-async-promise-executor",
    category: "Suspicious",
    description:
      "Disallows using an async function as a Promise executor.\nSee https://biomejs.dev/linter/rules/no-async-promise-executor",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-async-promise-executor/",
  },
  {
    id: "noAutofocus",
    name: "no-autofocus",
    category: "A11y",
    description:
      "Enforce that autoFocus prop is not used on elements.\nSee https://biomejs.dev/linter/rules/no-autofocus",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-autofocus/",
  },
  {
    id: "noBannedTypes",
    name: "no-banned-types",
    category: "Complexity",
    description:
      "Disallow primitive type aliases and misleading types.\nSee https://biomejs.dev/linter/rules/no-banned-types",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-banned-types/",
  },
  {
    id: "noBarrelFile",
    name: "no-barrel-file",
    category: "Performance",
    description:
      "Disallow the use of barrel file.\nSee https://biomejs.dev/linter/rules/no-barrel-file",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/performance/no-barrel-file/",
  },
  {
    id: "noBitwiseOperators",
    name: "no-bitwise-operators",
    category: "Suspicious",
    description:
      "Disallow bitwise operators.\nSee https://biomejs.dev/linter/rules/no-bitwise-operators",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-bitwise-operators/",
  },
  {
    id: "noBlankTarget",
    name: "no-blank-target",
    category: "Security",
    description:
      'Disallow target="_blank" attribute without rel="noopener".\nSee https://biomejs.dev/linter/rules/no-blank-target',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/security/no-blank-target/",
  },
  {
    id: "noCatchAssign",
    name: "no-catch-assign",
    category: "Suspicious",
    description:
      "Disallow reassigning exceptions in catch clauses.\nSee https://biomejs.dev/linter/rules/no-catch-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-catch-assign/",
  },
  {
    id: "noChildrenProp",
    name: "no-children-prop",
    category: "Correctness",
    description:
      "Prevent passing of children as props.\nSee https://biomejs.dev/linter/rules/no-children-prop",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-children-prop/",
  },
  {
    id: "noClassAssign",
    name: "no-class-assign",
    category: "Suspicious",
    description:
      "Disallow reassigning class members.\nSee https://biomejs.dev/linter/rules/no-class-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-class-assign/",
  },
  {
    id: "noCommaOperator",
    name: "no-comma-operator",
    category: "Complexity",
    description:
      "Disallow comma operator.\nSee https://biomejs.dev/linter/rules/no-comma-operator",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-comma-operator/",
  },
  {
    id: "noCommentText",
    name: "no-comment-text",
    category: "Suspicious",
    description:
      "Prevent comments from being inserted as text nodes.\nSee https://biomejs.dev/linter/rules/no-comment-text",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-comment-text/",
  },
  {
    id: "noCommonJs",
    name: "no-common-js",
    category: "Style",
    description:
      "Disallow use of CommonJs module system in favor of ESM style imports.\nSee https://biomejs.dev/linter/rules/no-common-js",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-common-js/",
  },
  {
    id: "noCompareNegZero",
    name: "no-compare-neg-zero",
    category: "Suspicious",
    description:
      "Disallow comparing against -0.\nSee https://biomejs.dev/linter/rules/no-compare-neg-zero",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-compare-neg-zero/",
  },
  {
    id: "noConfusingLabels",
    name: "no-confusing-labels",
    category: "Suspicious",
    description:
      "Disallow labeled statements that are not loops.\nSee https://biomejs.dev/linter/rules/no-confusing-labels",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-confusing-labels/",
  },
  {
    id: "noConfusingVoidType",
    name: "no-confusing-void-type",
    category: "Suspicious",
    description:
      "Disallow void type outside of generic or return types.\nSee https://biomejs.dev/linter/rules/no-confusing-void-type",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-confusing-void-type/",
  },
  {
    id: "noConsole",
    name: "no-console",
    category: "Suspicious",
    description:
      "Disallow the use of console.\nSee https://biomejs.dev/linter/rules/no-console",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-console/",
  },
  {
    id: "noConstAssign",
    name: "no-const-assign",
    category: "Correctness",
    description:
      "Prevents from having const variables being re-assigned.\nSee https://biomejs.dev/linter/rules/no-const-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-const-assign/",
  },
  {
    id: "noConstEnum",
    name: "no-const-enum",
    category: "Suspicious",
    description:
      "Disallow TypeScript const enum.\nSee https://biomejs.dev/linter/rules/no-const-enum",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-const-enum/",
  },
  {
    id: "noConstantCondition",
    name: "no-constant-condition",
    category: "Correctness",
    description:
      "Disallow constant expressions in conditions.\nSee https://biomejs.dev/linter/rules/no-constant-condition",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-constant-condition/",
  },
  {
    id: "noConstantMathMinMaxClamp",
    name: "no-constant-math-min-max-clamp",
    category: "Correctness",
    description:
      "Disallow the use of Math.min and Math.max to clamp a value where the result itself is constant.\nSee https://biomejs.dev/linter/rules/no-constant-math-min-max-clamp",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-constant-math-min-max-clamp/",
  },
  {
    id: "noConstructorReturn",
    name: "no-constructor-return",
    category: "Correctness",
    description:
      "Disallow returning a value from a constructor.\nSee https://biomejs.dev/linter/rules/no-constructor-return",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-constructor-return/",
  },
  {
    id: "noControlCharactersInRegex",
    name: "no-control-characters-in-regex",
    category: "Suspicious",
    description:
      "Prevents from having control characters and some escape sequences that match control characters in regular expression literals.\nSee https://biomejs.dev/linter/rules/no-control-characters-in-regex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-control-characters-in-regex/",
  },
  {
    id: "noDangerouslySetInnerHtml",
    name: "no-dangerously-set-inner-html",
    category: "Security",
    description:
      "Prevent the usage of dangerous JSX props.\nSee https://biomejs.dev/linter/rules/no-dangerously-set-inner-html",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/security/no-dangerously-set-inner-html/",
  },
  {
    id: "noDangerouslySetInnerHtmlWithChildren",
    name: "no-dangerously-set-inner-html-with-children",
    category: "Security",
    description:
      "Report when a DOM element or a component uses both children and dangerouslySetInnerHTML prop.\nSee https://biomejs.dev/linter/rules/no-dangerously-set-inner-html-with-children",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/security/no-dangerously-set-inner-html-with-children/",
  },
  {
    id: "noDebugger",
    name: "no-debugger",
    category: "Suspicious",
    description:
      "Disallow the use of debugger.\nSee https://biomejs.dev/linter/rules/no-debugger",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-debugger/",
  },
  {
    id: "noDefaultExport",
    name: "no-default-export",
    category: "Style",
    description:
      "Disallow default exports.\nSee https://biomejs.dev/linter/rules/no-default-export",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-default-export/",
  },
  {
    id: "noDelete",
    name: "no-delete",
    category: "Performance",
    description:
      "Disallow the use of the delete operator.\nSee https://biomejs.dev/linter/rules/no-delete",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/performance/no-delete/",
  },
  {
    id: "noDescendingSpecificity",
    name: "no-descending-specificity",
    category: "Style",
    description:
      "Disallow a lower specificity selector from coming after a higher specificity selector.\nSee https://biomejs.dev/linter/rules/no-descending-specificity",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-descending-specificity/",
  },
  {
    id: "noDistractingElements",
    name: "no-distracting-elements",
    category: "A11y",
    description:
      "Enforces that no distracting elements are used.\nSee https://biomejs.dev/linter/rules/no-distracting-elements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-distracting-elements/",
  },
  {
    id: "noDocumentCookie",
    name: "no-document-cookie",
    category: "Suspicious",
    description:
      "Disallow direct assignments to document.cookie.\nSee https://biomejs.dev/linter/rules/no-document-cookie",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-document-cookie/",
  },
  {
    id: "noDocumentImportInPage",
    name: "no-document-import-in-page",
    category: "Suspicious",
    description:
      "Prevents importing next/document outside of pages/_document.jsx in Next.js projects.\nSee https://biomejs.dev/linter/rules/no-document-import-in-page",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-document-import-in-page/",
  },
  {
    id: "noDoneCallback",
    name: "no-done-callback",
    category: "Style",
    description:
      "Disallow using a callback in asynchronous tests and hooks.\nSee https://biomejs.dev/linter/rules/no-done-callback",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-done-callback/",
  },
  {
    id: "noDoubleEquals",
    name: "no-double-equals",
    category: "Suspicious",
    description:
      "Require the use of === and !==.\nSee https://biomejs.dev/linter/rules/no-double-equals",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-double-equals/",
  },
  {
    id: "noDuplicateAtImportRules",
    name: "no-duplicate-at-import-rules",
    category: "Suspicious",
    description:
      "Disallow duplicate @import rules.\nSee https://biomejs.dev/linter/rules/no-duplicate-at-import-rules",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-at-import-rules/",
  },
  {
    id: "noDuplicateCase",
    name: "no-duplicate-case",
    category: "Suspicious",
    description:
      "Disallow duplicate case labels.\nSee https://biomejs.dev/linter/rules/no-duplicate-case",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-duplicate-case/",
  },
  {
    id: "noDuplicateClassMembers",
    name: "no-duplicate-class-members",
    category: "Suspicious",
    description:
      "Disallow duplicate class members.\nSee https://biomejs.dev/linter/rules/no-duplicate-class-members",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-class-members/",
  },
  {
    id: "noDuplicateCustomProperties",
    name: "no-duplicate-custom-properties",
    category: "Suspicious",
    description:
      "Disallow duplicate custom properties within declaration blocks.\nSee https://biomejs.dev/linter/rules/no-duplicate-custom-properties",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-custom-properties/",
  },
  {
    id: "noDuplicateElseIf",
    name: "no-duplicate-else-if",
    category: "Suspicious",
    description:
      "Disallow duplicate conditions in if-else-if chains.\nSee https://biomejs.dev/linter/rules/no-duplicate-else-if",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-duplicate-else-if/",
  },
  {
    id: "noDuplicateFields",
    name: "no-duplicate-fields",
    category: "Suspicious",
    description:
      "No duplicated fields in GraphQL operations.\nSee https://biomejs.dev/linter/rules/no-duplicate-fields",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-duplicate-fields/",
  },
  {
    id: "noDuplicateFontNames",
    name: "no-duplicate-font-names",
    category: "Suspicious",
    description:
      "Disallow duplicate names within font families.\nSee https://biomejs.dev/linter/rules/no-duplicate-font-names",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-font-names/",
  },
  {
    id: "noDuplicateJsxProps",
    name: "no-duplicate-jsx-props",
    category: "Suspicious",
    description:
      "Prevents JSX properties to be assigned multiple times.\nSee https://biomejs.dev/linter/rules/no-duplicate-jsx-props",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-jsx-props/",
  },
  {
    id: "noDuplicateObjectKeys",
    name: "no-duplicate-object-keys",
    category: "Suspicious",
    description:
      "Disallow two keys with the same name inside objects.\nSee https://biomejs.dev/linter/rules/no-duplicate-object-keys",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-object-keys/",
  },
  {
    id: "noDuplicateParameters",
    name: "no-duplicate-parameters",
    category: "Suspicious",
    description:
      "Disallow duplicate function parameter name.\nSee https://biomejs.dev/linter/rules/no-duplicate-parameters",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-parameters/",
  },
  {
    id: "noDuplicateProperties",
    name: "no-duplicate-properties",
    category: "Suspicious",
    description:
      "Disallow duplicate properties within declaration blocks.\nSee https://biomejs.dev/linter/rules/no-duplicate-properties",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-properties/",
  },
  {
    id: "noDuplicateSelectorsKeyframeBlock",
    name: "no-duplicate-selectors-keyframe-block",
    category: "Suspicious",
    description:
      "Disallow duplicate selectors within keyframe blocks.\nSee https://biomejs.dev/linter/rules/no-duplicate-selectors-keyframe-block",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-selectors-keyframe-block/",
  },
  {
    id: "noDuplicateTestHooks",
    name: "no-duplicate-test-hooks",
    category: "Suspicious",
    description:
      "A describe block should not contain duplicate hooks.\nSee https://biomejs.dev/linter/rules/no-duplicate-test-hooks",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-duplicate-test-hooks/",
  },
  {
    id: "noDynamicNamespaceImportAccess",
    name: "no-dynamic-namespace-import-access",
    category: "Performance",
    description:
      "Disallow accessing namespace imports dynamically.\nSee https://biomejs.dev/linter/rules/no-dynamic-namespace-import-access",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/performance/no-dynamic-namespace-import-access/",
  },
  {
    id: "noEmptyBlock",
    name: "no-empty-block",
    category: "Suspicious",
    description:
      "Disallow CSS empty blocks.\nSee https://biomejs.dev/linter/rules/no-empty-block",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-empty-block/",
  },
  {
    id: "noEmptyBlockStatements",
    name: "no-empty-block-statements",
    category: "Suspicious",
    description:
      "Disallow empty block statements and static blocks.\nSee https://biomejs.dev/linter/rules/no-empty-block-statements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-empty-block-statements/",
  },
  {
    id: "noEmptyCharacterClassInRegex",
    name: "no-empty-character-class-in-regex",
    category: "Correctness",
    description:
      "Disallow empty character classes in regular expression literals.\nSee https://biomejs.dev/linter/rules/no-empty-character-class-in-regex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-empty-character-class-in-regex/",
  },
  {
    id: "noEmptyInterface",
    name: "no-empty-interface",
    category: "Suspicious",
    description:
      "Disallow the declaration of empty interfaces.\nSee https://biomejs.dev/linter/rules/no-empty-interface",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-empty-interface/",
  },
  {
    id: "noEmptyPattern",
    name: "no-empty-pattern",
    category: "Correctness",
    description:
      "Disallows empty destructuring patterns.\nSee https://biomejs.dev/linter/rules/no-empty-pattern",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-empty-pattern/",
  },
  {
    id: "noEmptyTypeParameters",
    name: "no-empty-type-parameters",
    category: "Complexity",
    description:
      "Disallow empty type parameters in type aliases and interfaces.\nSee https://biomejs.dev/linter/rules/no-empty-type-parameters",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-empty-type-parameters/",
  },
  {
    id: "noEnum",
    name: "no-enum",
    category: "Style",
    description:
      "Disallow TypeScript enum.\nSee https://biomejs.dev/linter/rules/no-enum",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-enum/",
  },
  {
    id: "noEvolvingTypes",
    name: "no-evolving-types",
    category: "Suspicious",
    description:
      "Disallow variables from evolving into any type through reassignments.\nSee https://biomejs.dev/linter/rules/no-evolving-types",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-evolving-types/",
  },
  {
    id: "noExcessiveCognitiveComplexity",
    name: "no-excessive-cognitive-complexity",
    category: "Complexity",
    description:
      "Disallow functions that exceed a given Cognitive Complexity score.\nSee https://biomejs.dev/linter/rules/no-excessive-cognitive-complexity",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-excessive-cognitive-complexity/",
  },
  {
    id: "noExcessiveNestedTestSuites",
    name: "no-excessive-nested-test-suites",
    category: "Complexity",
    description:
      "This rule enforces a maximum depth to nested describe() in test files.\nSee https://biomejs.dev/linter/rules/no-excessive-nested-test-suites",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-excessive-nested-test-suites/",
  },
  {
    id: "noExplicitAny",
    name: "no-explicit-any",
    category: "Suspicious",
    description:
      "Disallow the any type usage.\nSee https://biomejs.dev/linter/rules/no-explicit-any",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-explicit-any/",
  },
  {
    id: "noExportedImports",
    name: "no-exported-imports",
    category: "Style",
    description:
      "Disallow exporting an imported variable.\nSee https://biomejs.dev/linter/rules/no-exported-imports",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-exported-imports/",
  },
  {
    id: "noExportsInTest",
    name: "no-exports-in-test",
    category: "Suspicious",
    description:
      "Disallow using export or module.exports in files containing tests.\nSee https://biomejs.dev/linter/rules/no-exports-in-test",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-exports-in-test/",
  },
  {
    id: "noExtraBooleanCast",
    name: "no-extra-boolean-cast",
    category: "Complexity",
    description:
      "Disallow unnecessary boolean casts.\nSee https://biomejs.dev/linter/rules/no-extra-boolean-cast",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-extra-boolean-cast/",
  },
  {
    id: "noExtraNonNullAssertion",
    name: "no-extra-non-null-assertion",
    category: "Suspicious",
    description:
      "Prevents the wrong usage of the non-null assertion operator (!) in TypeScript files.\nSee https://biomejs.dev/linter/rules/no-extra-non-null-assertion",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-extra-non-null-assertion/",
  },
  {
    id: "noFallthroughSwitchClause",
    name: "no-fallthrough-switch-clause",
    category: "Suspicious",
    description:
      "Disallow fallthrough of switch clauses.\nSee https://biomejs.dev/linter/rules/no-fallthrough-switch-clause",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-fallthrough-switch-clause/",
  },
  {
    id: "noFlatMapIdentity",
    name: "no-flat-map-identity",
    category: "Complexity",
    description:
      "Disallow to use unnecessary callback on flatMap.\nSee https://biomejs.dev/linter/rules/no-flat-map-identity",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-flat-map-identity/",
  },
  {
    id: "noFloatingPromises",
    name: "no-floating-promises",
    category: "Nursery",
    description:
      "Require Promise-like statements to be handled appropriately.\nSee https://biomejs.dev/linter/rules/no-floating-promises",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-floating-promises/",
  },
  {
    id: "noFocusedTests",
    name: "no-focused-tests",
    category: "Suspicious",
    description:
      "Disallow focused tests.\nSee https://biomejs.dev/linter/rules/no-focused-tests",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-focused-tests/",
  },
  {
    id: "noForEach",
    name: "no-for-each",
    category: "Complexity",
    description:
      "Prefer for...of statement instead of Array.forEach.\nSee https://biomejs.dev/linter/rules/no-for-each",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-for-each/",
  },
  {
    id: "noFunctionAssign",
    name: "no-function-assign",
    category: "Suspicious",
    description:
      "Disallow reassigning function declarations.\nSee https://biomejs.dev/linter/rules/no-function-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-function-assign/",
  },
  {
    id: "noGlobalAssign",
    name: "no-global-assign",
    category: "Suspicious",
    description:
      "Disallow assignments to native objects and read-only global variables.\nSee https://biomejs.dev/linter/rules/no-global-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-global-assign/",
  },
  {
    id: "noGlobalDirnameFilename",
    name: "no-global-dirname-filename",
    category: "Correctness",
    description:
      "Disallow the use of __dirname and __filename in the global scope.\nSee https://biomejs.dev/linter/rules/no-global-dirname-filename",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-global-dirname-filename/",
  },
  {
    id: "noGlobalEval",
    name: "no-global-eval",
    category: "Security",
    description:
      "Disallow the use of global eval().\nSee https://biomejs.dev/linter/rules/no-global-eval",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/security/no-global-eval/",
  },
  {
    id: "noGlobalIsFinite",
    name: "no-global-is-finite",
    category: "Suspicious",
    description:
      "Use Number.isFinite instead of global isFinite.\nSee https://biomejs.dev/linter/rules/no-global-is-finite",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-global-is-finite/",
  },
  {
    id: "noGlobalIsNan",
    name: "no-global-is-nan",
    category: "Suspicious",
    description:
      "Use Number.isNaN instead of global isNaN.\nSee https://biomejs.dev/linter/rules/no-global-is-nan",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-global-is-nan/",
  },
  {
    id: "noGlobalObjectCalls",
    name: "no-global-object-calls",
    category: "Correctness",
    description:
      "Disallow calling global object properties as functions.\nSee https://biomejs.dev/linter/rules/no-global-object-calls",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-global-object-calls/",
  },
  {
    id: "noHeadElement",
    name: "no-head-element",
    category: "Style",
    description:
      "Prevent usage of \\<head> element in a Next.js project.\nSee https://biomejs.dev/linter/rules/no-head-element",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-head-element/",
  },
  {
    id: "noHeadImportInDocument",
    name: "no-head-import-in-document",
    category: "Suspicious",
    description:
      "Prevent using the next/head module in pages/_document.js on Next.js projects.\nSee https://biomejs.dev/linter/rules/no-head-import-in-document",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-head-import-in-document/",
  },
  {
    id: "noHeaderScope",
    name: "no-header-scope",
    category: "A11y",
    description:
      "The scope prop should be used only on \\<th> elements.\nSee https://biomejs.dev/linter/rules/no-header-scope",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-header-scope/",
  },
  {
    id: "noImgElement",
    name: "no-img-element",
    category: "Performance",
    description:
      "Prevent usage of \\<img> element in a Next.js project.\nSee https://biomejs.dev/linter/rules/no-img-element",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/performance/no-img-element/",
  },
  {
    id: "noImplicitAnyLet",
    name: "no-implicit-any-let",
    category: "Suspicious",
    description:
      "Disallow use of implicit any type on variable declarations.\nSee https://biomejs.dev/linter/rules/no-implicit-any-let",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-implicit-any-let/",
  },
  {
    id: "noImplicitBoolean",
    name: "no-implicit-boolean",
    category: "Style",
    description:
      "Disallow implicit true values on JSX boolean attributes.\nSee https://biomejs.dev/linter/rules/no-implicit-boolean",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-implicit-boolean/",
  },
  {
    id: "noImportAssign",
    name: "no-import-assign",
    category: "Suspicious",
    description:
      "Disallow assigning to imported bindings.\nSee https://biomejs.dev/linter/rules/no-import-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-import-assign/",
  },
  {
    id: "noImportCycles",
    name: "no-import-cycles",
    category: "Nursery",
    description:
      "Prevent import cycles.\nSee https://biomejs.dev/linter/rules/no-import-cycles",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-import-cycles/",
  },
  {
    id: "noImportantInKeyframe",
    name: "no-important-in-keyframe",
    category: "Suspicious",
    description:
      "Disallow invalid !important within keyframe declarations.\nSee https://biomejs.dev/linter/rules/no-important-in-keyframe",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-important-in-keyframe/",
  },
  {
    id: "noImportantStyles",
    name: "no-important-styles",
    category: "Complexity",
    description:
      "Disallow the use of the !important style.\nSee https://biomejs.dev/linter/rules/no-important-styles",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-important-styles/",
  },
  {
    id: "noInferrableTypes",
    name: "no-inferrable-types",
    category: "Style",
    description:
      "Disallow type annotations for variables, parameters, and class properties initialized with a literal expression.\nSee https://biomejs.dev/linter/rules/no-inferrable-types",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-inferrable-types/",
  },
  {
    id: "noInnerDeclarations",
    name: "no-inner-declarations",
    category: "Correctness",
    description:
      "Disallow function and var declarations that are accessible outside their block.\nSee https://biomejs.dev/linter/rules/no-inner-declarations",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-inner-declarations/",
  },
  {
    id: "noInteractiveElementToNoninteractiveRole",
    name: "no-interactive-element-to-noninteractive-role",
    category: "A11y",
    description:
      "Enforce that non-interactive ARIA roles are not assigned to interactive HTML elements.\nSee https://biomejs.dev/linter/rules/no-interactive-element-to-noninteractive-role",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/no-interactive-element-to-noninteractive-role/",
  },
  {
    id: "noInvalidBuiltinInstantiation",
    name: "no-invalid-builtin-instantiation",
    category: "Correctness",
    description:
      "Ensure that builtins are correctly instantiated.\nSee https://biomejs.dev/linter/rules/no-invalid-builtin-instantiation",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-invalid-builtin-instantiation/",
  },
  {
    id: "noInvalidConstructorSuper",
    name: "no-invalid-constructor-super",
    category: "Correctness",
    description:
      "Prevents the incorrect use of super() inside classes. It also checks whether a call super() is missing from classes that extends other constructors.\nSee https://biomejs.dev/linter/rules/no-invalid-constructor-super",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-invalid-constructor-super/",
  },
  {
    id: "noInvalidDirectionInLinearGradient",
    name: "no-invalid-direction-in-linear-gradient",
    category: "Correctness",
    description:
      "Disallow non-standard direction values for linear gradient functions.\nSee https://biomejs.dev/linter/rules/no-invalid-direction-in-linear-gradient",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-invalid-direction-in-linear-gradient/",
  },
  {
    id: "noInvalidGridAreas",
    name: "no-invalid-grid-areas",
    category: "Correctness",
    description:
      "Disallows invalid named grid areas in CSS Grid Layouts.\nSee https://biomejs.dev/linter/rules/no-invalid-grid-areas",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-invalid-grid-areas/",
  },
  {
    id: "noInvalidPositionAtImportRule",
    name: "no-invalid-position-at-import-rule",
    category: "Correctness",
    description:
      "Disallow the use of @import at-rules in invalid positions.\nSee https://biomejs.dev/linter/rules/no-invalid-position-at-import-rule",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-invalid-position-at-import-rule/",
  },
  {
    id: "noInvalidUseBeforeDeclaration",
    name: "no-invalid-use-before-declaration",
    category: "Correctness",
    description:
      "Disallow the use of variables, function parameters, classes, and enums before their declaration.\nSee https://biomejs.dev/linter/rules/no-invalid-use-before-declaration",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-invalid-use-before-declaration/",
  },
  {
    id: "noIrregularWhitespace",
    name: "no-irregular-whitespace",
    category: "Suspicious",
    description:
      "Disallows the use of irregular whitespace characters.\nSee https://biomejs.dev/linter/rules/no-irregular-whitespace",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-irregular-whitespace/",
  },
  {
    id: "noLabelVar",
    name: "no-label-var",
    category: "Suspicious",
    description:
      "Disallow labels that share a name with a variable.\nSee https://biomejs.dev/linter/rules/no-label-var",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-label-var/",
  },
  {
    id: "noLabelWithoutControl",
    name: "no-label-without-control",
    category: "A11y",
    description:
      "Enforce that a label element or component has a text label and an associated input.\nSee https://biomejs.dev/linter/rules/no-label-without-control",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-label-without-control/",
  },
  {
    id: "noMisleadingCharacterClass",
    name: "no-misleading-character-class",
    category: "Suspicious",
    description:
      "Disallow characters made with multiple code points in character class syntax.\nSee https://biomejs.dev/linter/rules/no-misleading-character-class",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-misleading-character-class/",
  },
  {
    id: "noMisleadingInstantiator",
    name: "no-misleading-instantiator",
    category: "Suspicious",
    description:
      "Enforce proper usage of new and constructor.\nSee https://biomejs.dev/linter/rules/no-misleading-instantiator",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-misleading-instantiator/",
  },
  {
    id: "noMisplacedAssertion",
    name: "no-misplaced-assertion",
    category: "Suspicious",
    description:
      "Checks that the assertion function, for example expect, is placed inside an it() function call.\nSee https://biomejs.dev/linter/rules/no-misplaced-assertion",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-misplaced-assertion/",
  },
  {
    id: "noMisrefactoredShorthandAssign",
    name: "no-misrefactored-shorthand-assign",
    category: "Suspicious",
    description:
      "Disallow shorthand assign when variable appears on both sides.\nSee https://biomejs.dev/linter/rules/no-misrefactored-shorthand-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-misrefactored-shorthand-assign/",
  },
  {
    id: "noMissingVarFunction",
    name: "no-missing-var-function",
    category: "Correctness",
    description:
      "Disallow missing var function for css variables.\nSee https://biomejs.dev/linter/rules/no-missing-var-function",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-missing-var-function/",
  },
  {
    id: "noNamespace",
    name: "no-namespace",
    category: "Style",
    description:
      "Disallow the use of TypeScript's namespaces.\nSee https://biomejs.dev/linter/rules/no-namespace",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-namespace/",
  },
  {
    id: "noNamespaceImport",
    name: "no-namespace-import",
    category: "Performance",
    description:
      "Disallow the use of namespace imports.\nSee https://biomejs.dev/linter/rules/no-namespace-import",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/performance/no-namespace-import/",
  },
  {
    id: "noNegationElse",
    name: "no-negation-else",
    category: "Style",
    description:
      "Disallow negation in the condition of an if statement if it has an else clause.\nSee https://biomejs.dev/linter/rules/no-negation-else",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-negation-else/",
  },
  {
    id: "noNestedComponentDefinitions",
    name: "no-nested-component-definitions",
    category: "Correctness",
    description:
      "Disallows defining React components inside other components.\nSee https://biomejs.dev/linter/rules/no-nested-component-definitions",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-nested-component-definitions/",
  },
  {
    id: "noNestedTernary",
    name: "no-nested-ternary",
    category: "Style",
    description:
      "Disallow nested ternary expressions.\nSee https://biomejs.dev/linter/rules/no-nested-ternary",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-nested-ternary/",
  },
  {
    id: "noNodejsModules",
    name: "no-nodejs-modules",
    category: "Correctness",
    description:
      "Forbid the use of Node.js builtin modules.\nSee https://biomejs.dev/linter/rules/no-nodejs-modules",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-nodejs-modules/",
  },
  {
    id: "noNonNullAssertion",
    name: "no-non-null-assertion",
    category: "Style",
    description:
      "Disallow non-null assertions using the ! postfix operator.\nSee https://biomejs.dev/linter/rules/no-non-null-assertion",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-non-null-assertion/",
  },
  {
    id: "noNoninteractiveElementInteractions",
    name: "no-noninteractive-element-interactions",
    category: "A11y",
    description:
      "Disallow use event handlers on non-interactive elements.\nSee https://biomejs.dev/linter/rules/no-noninteractive-element-interactions",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/no-noninteractive-element-interactions/",
  },
  {
    id: "noNoninteractiveElementToInteractiveRole",
    name: "no-noninteractive-element-to-interactive-role",
    category: "A11y",
    description:
      "Enforce that interactive ARIA roles are not assigned to non-interactive HTML elements.\nSee https://biomejs.dev/linter/rules/no-noninteractive-element-to-interactive-role",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/no-noninteractive-element-to-interactive-role/",
  },
  {
    id: "noNoninteractiveTabindex",
    name: "no-noninteractive-tabindex",
    category: "A11y",
    description:
      "Enforce that tabIndex is not assigned to non-interactive HTML elements.\nSee https://biomejs.dev/linter/rules/no-noninteractive-tabindex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-noninteractive-tabindex/",
  },
  {
    id: "noNonoctalDecimalEscape",
    name: "no-nonoctal-decimal-escape",
    category: "Correctness",
    description:
      "Disallow \\8 and \\9 escape sequences in string literals.\nSee https://biomejs.dev/linter/rules/no-nonoctal-decimal-escape",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-nonoctal-decimal-escape/",
  },
  {
    id: "noOctalEscape",
    name: "no-octal-escape",
    category: "Suspicious",
    description:
      "Disallow octal escape sequences in string literals.\nSee https://biomejs.dev/linter/rules/no-octal-escape",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-octal-escape/",
  },
  {
    id: "noParameterAssign",
    name: "no-parameter-assign",
    category: "Style",
    description:
      "Disallow reassigning function parameters.\nSee https://biomejs.dev/linter/rules/no-parameter-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-parameter-assign/",
  },
  {
    id: "noParameterProperties",
    name: "no-parameter-properties",
    category: "Style",
    description:
      "Disallow the use of parameter properties in class constructors.\nSee https://biomejs.dev/linter/rules/no-parameter-properties",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-parameter-properties/",
  },
  {
    id: "noPositiveTabindex",
    name: "no-positive-tabindex",
    category: "A11y",
    description:
      "Prevent the usage of positive integers on tabIndex property.\nSee https://biomejs.dev/linter/rules/no-positive-tabindex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-positive-tabindex/",
  },
  {
    id: "noPrecisionLoss",
    name: "no-precision-loss",
    category: "Correctness",
    description:
      "Disallow literal numbers that lose precision.\nSee https://biomejs.dev/linter/rules/no-precision-loss",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-precision-loss/",
  },
  {
    id: "noPrivateImports",
    name: "no-private-imports",
    category: "Correctness",
    description:
      "Restrict imports of private exports.\nSee https://biomejs.dev/linter/rules/no-private-imports",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-private-imports/",
  },
  {
    id: "noProcessEnv",
    name: "no-process-env",
    category: "Style",
    description:
      "Disallow the use of process.env.\nSee https://biomejs.dev/linter/rules/no-process-env",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-process-env/",
  },
  {
    id: "noProcessGlobal",
    name: "no-process-global",
    category: "Correctness",
    description:
      "Disallow the use of process global.\nSee https://biomejs.dev/linter/rules/no-process-global",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-process-global/",
  },
  {
    id: "noPrototypeBuiltins",
    name: "no-prototype-builtins",
    category: "Suspicious",
    description:
      "Disallow direct use of Object.prototype builtins.\nSee https://biomejs.dev/linter/rules/no-prototype-builtins",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-prototype-builtins/",
  },
  {
    id: "noReExportAll",
    name: "no-re-export-all",
    category: "Performance",
    description:
      "Avoid re-export all.\nSee https://biomejs.dev/linter/rules/no-re-export-all",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/performance/no-re-export-all/",
  },
  {
    id: "noReactSpecificProps",
    name: "no-react-specific-props",
    category: "Suspicious",
    description:
      "Prevents React-specific JSX properties from being used.\nSee https://biomejs.dev/linter/rules/no-react-specific-props",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-react-specific-props/",
  },
  {
    id: "noRedeclare",
    name: "no-redeclare",
    category: "Suspicious",
    description:
      "Disallow variable, function, class, and type redeclarations in the same scope.\nSee https://biomejs.dev/linter/rules/no-redeclare",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-redeclare/",
  },
  {
    id: "noRedundantAlt",
    name: "no-redundant-alt",
    category: "A11y",
    description:
      'Enforce img alt prop does not contain the word "image", "picture", or "photo".\nSee https://biomejs.dev/linter/rules/no-redundant-alt',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-redundant-alt/",
  },
  {
    id: "noRedundantRoles",
    name: "no-redundant-roles",
    category: "A11y",
    description:
      "Enforce explicit role property is not the same as implicit/default role property on an element.\nSee https://biomejs.dev/linter/rules/no-redundant-roles",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-redundant-roles/",
  },
  {
    id: "noRedundantUseStrict",
    name: "no-redundant-use-strict",
    category: "Suspicious",
    description:
      'Prevents from having redundant "use strict".\nSee https://biomejs.dev/linter/rules/no-redundant-use-strict',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-redundant-use-strict/",
  },
  {
    id: "noRenderReturnValue",
    name: "no-render-return-value",
    category: "Correctness",
    description:
      "Prevent the usage of the return value of React.render.\nSee https://biomejs.dev/linter/rules/no-render-return-value",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-render-return-value/",
  },
  {
    id: "noRestrictedElements",
    name: "no-restricted-elements",
    category: "Correctness",
    description:
      "Disallow the use of configured elements.\nSee https://biomejs.dev/linter/rules/no-restricted-elements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-restricted-elements/",
  },
  {
    id: "noRestrictedGlobals",
    name: "no-restricted-globals",
    category: "Style",
    description:
      "This rule allows you to specify global variable names that you don’t want to use in your application.\nSee https://biomejs.dev/linter/rules/no-restricted-globals",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-restricted-globals/",
  },
  {
    id: "noRestrictedImports",
    name: "no-restricted-imports",
    category: "Style",
    description:
      "Disallow specified modules when loaded by import or require.\nSee https://biomejs.dev/linter/rules/no-restricted-imports",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-restricted-imports/",
  },
  {
    id: "noRestrictedTypes",
    name: "no-restricted-types",
    category: "Style",
    description:
      "Disallow user defined types.\nSee https://biomejs.dev/linter/rules/no-restricted-types",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-restricted-types/",
  },
  {
    id: "noSecrets",
    name: "no-secrets",
    category: "Security",
    description:
      "Disallow usage of sensitive data such as API keys and tokens.\nSee https://biomejs.dev/linter/rules/no-secrets",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/security/no-secrets/",
  },
  {
    id: "noSelfAssign",
    name: "no-self-assign",
    category: "Correctness",
    description:
      "Disallow assignments where both sides are exactly the same.\nSee https://biomejs.dev/linter/rules/no-self-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-self-assign/",
  },
  {
    id: "noSelfCompare",
    name: "no-self-compare",
    category: "Suspicious",
    description:
      "Disallow comparisons where both sides are exactly the same.\nSee https://biomejs.dev/linter/rules/no-self-compare",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-self-compare/",
  },
  {
    id: "noSetterReturn",
    name: "no-setter-return",
    category: "Correctness",
    description:
      "Disallow returning a value from a setter.\nSee https://biomejs.dev/linter/rules/no-setter-return",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-setter-return/",
  },
  {
    id: "noShadow",
    name: "no-shadow",
    category: "Nursery",
    description:
      "Disallow variable declarations from shadowing variables declared in the outer scope.\nSee https://biomejs.dev/linter/rules/no-shadow",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-shadow/",
  },
  {
    id: "noShadowRestrictedNames",
    name: "no-shadow-restricted-names",
    category: "Suspicious",
    description:
      "Disallow identifiers from shadowing restricted names.\nSee https://biomejs.dev/linter/rules/no-shadow-restricted-names",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-shadow-restricted-names/",
  },
  {
    id: "noShorthandPropertyOverrides",
    name: "no-shorthand-property-overrides",
    category: "Suspicious",
    description:
      "Disallow shorthand properties that override related longhand properties.\nSee https://biomejs.dev/linter/rules/no-shorthand-property-overrides",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-shorthand-property-overrides/",
  },
  {
    id: "noShoutyConstants",
    name: "no-shouty-constants",
    category: "Style",
    description:
      "Disallow the use of constants which its value is the upper-case version of its name.\nSee https://biomejs.dev/linter/rules/no-shouty-constants",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-shouty-constants/",
  },
  {
    id: "noSkippedTests",
    name: "no-skipped-tests",
    category: "Suspicious",
    description:
      "Disallow disabled tests.\nSee https://biomejs.dev/linter/rules/no-skipped-tests",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-skipped-tests/",
  },
  {
    id: "noSparseArray",
    name: "no-sparse-array",
    category: "Suspicious",
    description:
      "Prevents the use of sparse arrays (arrays with holes).\nSee https://biomejs.dev/linter/rules/no-sparse-array",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-sparse-array/",
  },
  {
    id: "noStaticElementInteractions",
    name: "no-static-element-interactions",
    category: "A11y",
    description:
      "Enforce that static, visible elements (such as \\<div>) that have click handlers use the valid role attribute.\nSee https://biomejs.dev/linter/rules/no-static-element-interactions",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/no-static-element-interactions/",
  },
  {
    id: "noStaticOnlyClass",
    name: "no-static-only-class",
    category: "Complexity",
    description:
      "This rule reports when a class has no non-static members, such as for a class used exclusively as a static namespace.\nSee https://biomejs.dev/linter/rules/no-static-only-class",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-static-only-class/",
  },
  {
    id: "noStringCaseMismatch",
    name: "no-string-case-mismatch",
    category: "Correctness",
    description:
      "Disallow comparison of expressions modifying the string case with non-compliant value.\nSee https://biomejs.dev/linter/rules/no-string-case-mismatch",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-string-case-mismatch/",
  },
  {
    id: "noSubstr",
    name: "no-substr",
    category: "Style",
    description:
      "Enforce the use of String.slice() over String.substr() and String.substring().\nSee https://biomejs.dev/linter/rules/no-substr",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-substr/",
  },
  {
    id: "noSuspiciousSemicolonInJsx",
    name: "no-suspicious-semicolon-in-jsx",
    category: "Suspicious",
    description:
      'It detects possible "wrong" semicolons inside JSX elements.\nSee https://biomejs.dev/linter/rules/no-suspicious-semicolon-in-jsx',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-suspicious-semicolon-in-jsx/",
  },
  {
    id: "noSvgWithoutTitle",
    name: "no-svg-without-title",
    category: "A11y",
    description:
      "Enforces the usage of the title element for the svg element.\nSee https://biomejs.dev/linter/rules/no-svg-without-title",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/no-svg-without-title/",
  },
  {
    id: "noSwitchDeclarations",
    name: "no-switch-declarations",
    category: "Correctness",
    description:
      "Disallow lexical declarations in switch clauses.\nSee https://biomejs.dev/linter/rules/no-switch-declarations",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-switch-declarations/",
  },
  {
    id: "noTemplateCurlyInString",
    name: "no-template-curly-in-string",
    category: "Suspicious",
    description:
      "Disallow template literal placeholder syntax in regular strings.\nSee https://biomejs.dev/linter/rules/no-template-curly-in-string",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-template-curly-in-string/",
  },
  {
    id: "noThenProperty",
    name: "no-then-property",
    category: "Suspicious",
    description:
      "Disallow then property.\nSee https://biomejs.dev/linter/rules/no-then-property",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-then-property/",
  },
  {
    id: "noThisInStatic",
    name: "no-this-in-static",
    category: "Complexity",
    description:
      "Disallow this and super in static contexts.\nSee https://biomejs.dev/linter/rules/no-this-in-static",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-this-in-static/",
  },
  {
    id: "noTsIgnore",
    name: "no-ts-ignore",
    category: "Suspicious",
    description:
      "Prevents the use of the TypeScript directive @ts-ignore.\nSee https://biomejs.dev/linter/rules/no-ts-ignore",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-ts-ignore/",
  },
  {
    id: "noUndeclaredDependencies",
    name: "no-undeclared-dependencies",
    category: "Correctness",
    description:
      "Disallow the use of dependencies that aren't specified in the package.json.\nSee https://biomejs.dev/linter/rules/no-undeclared-dependencies",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-undeclared-dependencies/",
  },
  {
    id: "noUndeclaredVariables",
    name: "no-undeclared-variables",
    category: "Correctness",
    description:
      "Prevents the usage of variables that haven't been declared inside the document.\nSee https://biomejs.dev/linter/rules/no-undeclared-variables",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-undeclared-variables/",
  },
  {
    id: "noUnknownFunction",
    name: "no-unknown-function",
    category: "Correctness",
    description:
      "Disallow unknown CSS value functions.\nSee https://biomejs.dev/linter/rules/no-unknown-function",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unknown-function/",
  },
  {
    id: "noUnknownMediaFeatureName",
    name: "no-unknown-media-feature-name",
    category: "Correctness",
    description:
      "Disallow unknown media feature names.\nSee https://biomejs.dev/linter/rules/no-unknown-media-feature-name",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unknown-media-feature-name/",
  },
  {
    id: "noUnknownProperty",
    name: "no-unknown-property",
    category: "Correctness",
    description:
      "Disallow unknown properties.\nSee https://biomejs.dev/linter/rules/no-unknown-property",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unknown-property/",
  },
  {
    id: "noUnknownPseudoClass",
    name: "no-unknown-pseudo-class",
    category: "Correctness",
    description:
      "Disallow unknown pseudo-class selectors.\nSee https://biomejs.dev/linter/rules/no-unknown-pseudo-class",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unknown-pseudo-class/",
  },
  {
    id: "noUnknownPseudoElement",
    name: "no-unknown-pseudo-element",
    category: "Correctness",
    description:
      "Disallow unknown pseudo-element selectors.\nSee https://biomejs.dev/linter/rules/no-unknown-pseudo-element",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unknown-pseudo-element/",
  },
  {
    id: "noUnknownTypeSelector",
    name: "no-unknown-type-selector",
    category: "Correctness",
    description:
      "Disallow unknown type selectors.\nSee https://biomejs.dev/linter/rules/no-unknown-type-selector",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unknown-type-selector/",
  },
  {
    id: "noUnknownUnit",
    name: "no-unknown-unit",
    category: "Correctness",
    description:
      "Disallow unknown CSS units.\nSee https://biomejs.dev/linter/rules/no-unknown-unit",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unknown-unit/",
  },
  {
    id: "noUnmatchableAnbSelector",
    name: "no-unmatchable-anb-selector",
    category: "Correctness",
    description:
      "Disallow unmatchable An+B selectors.\nSee https://biomejs.dev/linter/rules/no-unmatchable-anb-selector",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unmatchable-anb-selector/",
  },
  {
    id: "noUnreachable",
    name: "no-unreachable",
    category: "Correctness",
    description:
      "Disallow unreachable code.\nSee https://biomejs.dev/linter/rules/no-unreachable",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unreachable/",
  },
  {
    id: "noUnreachableSuper",
    name: "no-unreachable-super",
    category: "Correctness",
    description:
      "Ensures the super() constructor is called exactly once on every code  path in a class constructor before this is accessed if the class has a superclass.\nSee https://biomejs.dev/linter/rules/no-unreachable-super",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unreachable-super/",
  },
  {
    id: "noUnresolvedImports",
    name: "no-unresolved-imports",
    category: "Nursery",
    description:
      "Warn when importing non-existing exports.\nSee https://biomejs.dev/linter/rules/no-unresolved-imports",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-unresolved-imports/",
  },
  {
    id: "noUnsafeDeclarationMerging",
    name: "no-unsafe-declaration-merging",
    category: "Suspicious",
    description:
      "Disallow unsafe declaration merging between interfaces and classes.\nSee https://biomejs.dev/linter/rules/no-unsafe-declaration-merging",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-unsafe-declaration-merging/",
  },
  {
    id: "noUnsafeFinally",
    name: "no-unsafe-finally",
    category: "Correctness",
    description:
      "Disallow control flow statements in finally blocks.\nSee https://biomejs.dev/linter/rules/no-unsafe-finally",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unsafe-finally/",
  },
  {
    id: "noUnsafeNegation",
    name: "no-unsafe-negation",
    category: "Suspicious",
    description:
      "Disallow using unsafe negation.\nSee https://biomejs.dev/linter/rules/no-unsafe-negation",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-unsafe-negation/",
  },
  {
    id: "noUnsafeOptionalChaining",
    name: "no-unsafe-optional-chaining",
    category: "Correctness",
    description:
      "Disallow the use of optional chaining in contexts where the undefined value is not allowed.\nSee https://biomejs.dev/linter/rules/no-unsafe-optional-chaining",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unsafe-optional-chaining/",
  },
  {
    id: "noUnusedFunctionParameters",
    name: "no-unused-function-parameters",
    category: "Correctness",
    description:
      "Disallow unused function parameters.\nSee https://biomejs.dev/linter/rules/no-unused-function-parameters",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unused-function-parameters/",
  },
  {
    id: "noUnusedImports",
    name: "no-unused-imports",
    category: "Correctness",
    description:
      "Disallow unused imports.\nSee https://biomejs.dev/linter/rules/no-unused-imports",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unused-imports/",
  },
  {
    id: "noUnusedLabels",
    name: "no-unused-labels",
    category: "Correctness",
    description:
      "Disallow unused labels.\nSee https://biomejs.dev/linter/rules/no-unused-labels",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unused-labels/",
  },
  {
    id: "noUnusedPrivateClassMembers",
    name: "no-unused-private-class-members",
    category: "Correctness",
    description:
      "Disallow unused private class members.\nSee https://biomejs.dev/linter/rules/no-unused-private-class-members",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-unused-private-class-members/",
  },
  {
    id: "noUnusedTemplateLiteral",
    name: "no-unused-template-literal",
    category: "Style",
    description:
      "Disallow template literals if interpolation and special-character handling are not needed.\nSee https://biomejs.dev/linter/rules/no-unused-template-literal",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/no-unused-template-literal/",
  },
  {
    id: "noUnusedVariables",
    name: "no-unused-variables",
    category: "Correctness",
    description:
      "Disallow unused variables.\nSee https://biomejs.dev/linter/rules/no-unused-variables",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-unused-variables/",
  },
  {
    id: "noUnwantedPolyfillio",
    name: "no-unwanted-polyfillio",
    category: "Performance",
    description:
      "Prevent duplicate polyfills from Polyfill.io.\nSee https://biomejs.dev/linter/rules/no-unwanted-polyfillio",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/performance/no-unwanted-polyfillio/",
  },
  {
    id: "noUselessCatch",
    name: "no-useless-catch",
    category: "Complexity",
    description:
      "Disallow unnecessary catch clauses.\nSee https://biomejs.dev/linter/rules/no-useless-catch",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-useless-catch/",
  },
  {
    id: "noUselessConstructor",
    name: "no-useless-constructor",
    category: "Complexity",
    description:
      "Disallow unnecessary constructors.\nSee https://biomejs.dev/linter/rules/no-useless-constructor",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-constructor/",
  },
  {
    id: "noUselessContinue",
    name: "no-useless-continue",
    category: "Complexity",
    description:
      "Avoid using unnecessary continue.\nSee https://biomejs.dev/linter/rules/no-useless-continue",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-useless-continue/",
  },
  {
    id: "noUselessElse",
    name: "no-useless-else",
    category: "Style",
    description:
      "Disallow else block when the if block breaks early.\nSee https://biomejs.dev/linter/rules/no-useless-else",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-useless-else/",
  },
  {
    id: "noUselessEmptyExport",
    name: "no-useless-empty-export",
    category: "Complexity",
    description:
      "Disallow empty exports that don't change anything in a module file.\nSee https://biomejs.dev/linter/rules/no-useless-empty-export",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-empty-export/",
  },
  {
    id: "noUselessEscapeInRegex",
    name: "no-useless-escape-in-regex",
    category: "Complexity",
    description:
      "Disallow unnecessary escape sequence in regular expression literals.\nSee https://biomejs.dev/linter/rules/no-useless-escape-in-regex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-escape-in-regex/",
  },
  {
    id: "noUselessEscapeInString",
    name: "no-useless-escape-in-string",
    category: "Suspicious",
    description:
      "Disallow unnecessary escapes in string literals.\nSee https://biomejs.dev/linter/rules/no-useless-escape-in-string",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/no-useless-escape-in-string/",
  },
  {
    id: "noUselessFragments",
    name: "no-useless-fragments",
    category: "Complexity",
    description:
      "Disallow unnecessary fragments.\nSee https://biomejs.dev/linter/rules/no-useless-fragments",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-useless-fragments/",
  },
  {
    id: "noUselessLabel",
    name: "no-useless-label",
    category: "Complexity",
    description:
      "Disallow unnecessary labels.\nSee https://biomejs.dev/linter/rules/no-useless-label",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-useless-label/",
  },
  {
    id: "noUselessLoneBlockStatements",
    name: "no-useless-lone-block-statements",
    category: "Complexity",
    description:
      "Disallow unnecessary nested block statements.\nSee https://biomejs.dev/linter/rules/no-useless-lone-block-statements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-lone-block-statements/",
  },
  {
    id: "noUselessRename",
    name: "no-useless-rename",
    category: "Complexity",
    description:
      "Disallow renaming import, export, and destructured assignments to the same name.\nSee https://biomejs.dev/linter/rules/no-useless-rename",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-useless-rename/",
  },
  {
    id: "noUselessStringConcat",
    name: "no-useless-string-concat",
    category: "Complexity",
    description:
      "Disallow unnecessary concatenation of string or template literals.\nSee https://biomejs.dev/linter/rules/no-useless-string-concat",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-string-concat/",
  },
  {
    id: "noUselessStringRaw",
    name: "no-useless-string-raw",
    category: "Complexity",
    description:
      "Disallow unnecessary String.raw function in template string literals without any escape sequence.\nSee https://biomejs.dev/linter/rules/no-useless-string-raw",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-string-raw/",
  },
  {
    id: "noUselessSwitchCase",
    name: "no-useless-switch-case",
    category: "Complexity",
    description:
      "Disallow useless case in switch statements.\nSee https://biomejs.dev/linter/rules/no-useless-switch-case",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-switch-case/",
  },
  {
    id: "noUselessTernary",
    name: "no-useless-ternary",
    category: "Complexity",
    description:
      "Disallow ternary operators when simpler alternatives exist.\nSee https://biomejs.dev/linter/rules/no-useless-ternary",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-useless-ternary/",
  },
  {
    id: "noUselessThisAlias",
    name: "no-useless-this-alias",
    category: "Complexity",
    description:
      "Disallow useless this aliasing.\nSee https://biomejs.dev/linter/rules/no-useless-this-alias",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-this-alias/",
  },
  {
    id: "noUselessTypeConstraint",
    name: "no-useless-type-constraint",
    category: "Complexity",
    description:
      "Disallow using any or unknown as type constraint.\nSee https://biomejs.dev/linter/rules/no-useless-type-constraint",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-type-constraint/",
  },
  {
    id: "noUselessUndefined",
    name: "no-useless-undefined",
    category: "Nursery",
    description:
      "Disallow the use of useless undefined.\nSee https://biomejs.dev/linter/rules/no-useless-undefined",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/no-useless-undefined/",
  },
  {
    id: "noUselessUndefinedInitialization",
    name: "no-useless-undefined-initialization",
    category: "Complexity",
    description:
      "Disallow initializing variables to undefined.\nSee https://biomejs.dev/linter/rules/no-useless-undefined-initialization",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/no-useless-undefined-initialization/",
  },
  {
    id: "noValueAtRule",
    name: "no-value-at-rule",
    category: "Style",
    description:
      "Disallow use of @value rule in css modules.\nSee https://biomejs.dev/linter/rules/no-value-at-rule",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-value-at-rule/",
  },
  {
    id: "noVar",
    name: "no-var",
    category: "Suspicious",
    description:
      "Disallow the use of var.\nSee https://biomejs.dev/linter/rules/no-var",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-var/",
  },
  {
    id: "noVoid",
    name: "no-void",
    category: "Complexity",
    description:
      "Disallow the use of void operators, which is not a familiar operator.\nSee https://biomejs.dev/linter/rules/no-void",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/no-void/",
  },
  {
    id: "noVoidElementsWithChildren",
    name: "no-void-elements-with-children",
    category: "Correctness",
    description:
      "This rules prevents void elements (AKA self-closing elements) from having children.\nSee https://biomejs.dev/linter/rules/no-void-elements-with-children",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/no-void-elements-with-children/",
  },
  {
    id: "noVoidTypeReturn",
    name: "no-void-type-return",
    category: "Correctness",
    description:
      "Disallow returning a value from a function with the return type 'void'.\nSee https://biomejs.dev/linter/rules/no-void-type-return",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/no-void-type-return/",
  },
  {
    id: "noWith",
    name: "no-with",
    category: "Suspicious",
    description:
      "Disallow with statements in non-strict contexts.\nSee https://biomejs.dev/linter/rules/no-with",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/no-with/",
  },
  {
    id: "noYodaExpression",
    name: "no-yoda-expression",
    category: "Style",
    description:
      "Disallow the use of yoda expressions.\nSee https://biomejs.dev/linter/rules/no-yoda-expression",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/no-yoda-expression/",
  },
  {
    id: "useAdjacentOverloadSignatures",
    name: "use-adjacent-overload-signatures",
    category: "Suspicious",
    description:
      "Disallow the use of overload signatures that are not next to each other.\nSee https://biomejs.dev/linter/rules/use-adjacent-overload-signatures",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-adjacent-overload-signatures/",
  },
  {
    id: "useAltText",
    name: "use-alt-text",
    category: "A11y",
    description:
      "Enforce that all elements that require alternative text have meaningful information to relay back to the end user.\nSee https://biomejs.dev/linter/rules/use-alt-text",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-alt-text/",
  },
  {
    id: "useAnchorContent",
    name: "use-anchor-content",
    category: "A11y",
    description:
      "Enforce that anchors have content and that the content is accessible to screen readers.\nSee https://biomejs.dev/linter/rules/use-anchor-content",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-anchor-content/",
  },
  {
    id: "useAriaActivedescendantWithTabindex",
    name: "use-aria-activedescendant-with-tabindex",
    category: "A11y",
    description:
      "Enforce that tabIndex is assigned to non-interactive HTML elements with aria-activedescendant.\nSee https://biomejs.dev/linter/rules/use-aria-activedescendant-with-tabindex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/use-aria-activedescendant-with-tabindex/",
  },
  {
    id: "useAriaPropsForRole",
    name: "use-aria-props-for-role",
    category: "A11y",
    description:
      "Enforce that elements with ARIA roles must have all required ARIA attributes for that role.\nSee https://biomejs.dev/linter/rules/use-aria-props-for-role",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-aria-props-for-role/",
  },
  {
    id: "useAriaPropsSupportedByRole",
    name: "use-aria-props-supported-by-role",
    category: "A11y",
    description:
      "Enforce that ARIA properties are valid for the roles that are supported by the element.\nSee https://biomejs.dev/linter/rules/use-aria-props-supported-by-role",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/a11y/use-aria-props-supported-by-role/",
  },
  {
    id: "useArrayLiterals",
    name: "use-array-literals",
    category: "Style",
    description:
      "Disallow Array constructors.\nSee https://biomejs.dev/linter/rules/use-array-literals",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-array-literals/",
  },
  {
    id: "useArrowFunction",
    name: "use-arrow-function",
    category: "Complexity",
    description:
      "Use arrow functions over function expressions.\nSee https://biomejs.dev/linter/rules/use-arrow-function",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-arrow-function/",
  },
  {
    id: "useAsConstAssertion",
    name: "use-as-const-assertion",
    category: "Style",
    description:
      "Enforce the use of as const over literal type and type annotation.\nSee https://biomejs.dev/linter/rules/use-as-const-assertion",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-as-const-assertion/",
  },
  {
    id: "useAtIndex",
    name: "use-at-index",
    category: "Style",
    description:
      "Use at() instead of integer index access.\nSee https://biomejs.dev/linter/rules/use-at-index",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-at-index/",
  },
  {
    id: "useAwait",
    name: "use-await",
    category: "Suspicious",
    description:
      "Ensure async functions utilize await.\nSee https://biomejs.dev/linter/rules/use-await",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/use-await/",
  },
  {
    id: "useBlockStatements",
    name: "use-block-statements",
    category: "Style",
    description:
      "Requires following curly brace conventions.\nSee https://biomejs.dev/linter/rules/use-block-statements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-block-statements/",
  },
  {
    id: "useButtonType",
    name: "use-button-type",
    category: "A11y",
    description:
      "Enforces the usage of the attribute type for the element button.\nSee https://biomejs.dev/linter/rules/use-button-type",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-button-type/",
  },
  {
    id: "useCollapsedElseIf",
    name: "use-collapsed-else-if",
    category: "Style",
    description:
      "Enforce using else if instead of nested if in else clauses.\nSee https://biomejs.dev/linter/rules/use-collapsed-else-if",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-collapsed-else-if/",
  },
  {
    id: "useCollapsedIf",
    name: "use-collapsed-if",
    category: "Style",
    description:
      "Enforce using single if instead of nested if clauses.\nSee https://biomejs.dev/linter/rules/use-collapsed-if",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-collapsed-if/",
  },
  {
    id: "useComponentExportOnlyModules",
    name: "use-component-export-only-modules",
    category: "Style",
    description:
      "Enforce declaring components only within modules that export React Components exclusively.\nSee https://biomejs.dev/linter/rules/use-component-export-only-modules",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-component-export-only-modules/",
  },
  {
    id: "useConsistentArrayType",
    name: "use-consistent-array-type",
    category: "Style",
    description:
      "Require consistently using either T\\[] or Array\\<T>.\nSee https://biomejs.dev/linter/rules/use-consistent-array-type",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-consistent-array-type/",
  },
  {
    id: "useConsistentBuiltinInstantiation",
    name: "use-consistent-builtin-instantiation",
    category: "Style",
    description:
      "Enforce the use of new for all builtins, except String, Number and Boolean.\nSee https://biomejs.dev/linter/rules/use-consistent-builtin-instantiation",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-consistent-builtin-instantiation/",
  },
  {
    id: "useConsistentCurlyBraces",
    name: "use-consistent-curly-braces",
    category: "Style",
    description:
      "This rule enforces consistent use of curly braces inside JSX attributes and JSX children.\nSee https://biomejs.dev/linter/rules/use-consistent-curly-braces",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-consistent-curly-braces/",
  },
  {
    id: "useConsistentMemberAccessibility",
    name: "use-consistent-member-accessibility",
    category: "Style",
    description:
      "Require consistent accessibility modifiers on class properties and methods.\nSee https://biomejs.dev/linter/rules/use-consistent-member-accessibility",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-consistent-member-accessibility/",
  },
  {
    id: "useConst",
    name: "use-const",
    category: "Style",
    description:
      "Require const declarations for variables that are only assigned once.\nSee https://biomejs.dev/linter/rules/use-const",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-const/",
  },
  {
    id: "useDateNow",
    name: "use-date-now",
    category: "Complexity",
    description:
      "Use Date.now() to get the number of milliseconds since the Unix Epoch.\nSee https://biomejs.dev/linter/rules/use-date-now",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-date-now/",
  },
  {
    id: "useDefaultParameterLast",
    name: "use-default-parameter-last",
    category: "Style",
    description:
      "Enforce default function parameters and optional function parameters to be last.\nSee https://biomejs.dev/linter/rules/use-default-parameter-last",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-default-parameter-last/",
  },
  {
    id: "useDefaultSwitchClause",
    name: "use-default-switch-clause",
    category: "Style",
    description:
      "Require the default clause in switch statements.\nSee https://biomejs.dev/linter/rules/use-default-switch-clause",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-default-switch-clause/",
  },
  {
    id: "useDefaultSwitchClauseLast",
    name: "use-default-switch-clause-last",
    category: "Suspicious",
    description:
      "Enforce default clauses in switch statements to be last.\nSee https://biomejs.dev/linter/rules/use-default-switch-clause-last",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-default-switch-clause-last/",
  },
  {
    id: "useDeprecatedReason",
    name: "use-deprecated-reason",
    category: "Style",
    description:
      "Require specifying the reason argument when using @deprecated directive.\nSee https://biomejs.dev/linter/rules/use-deprecated-reason",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-deprecated-reason/",
  },
  {
    id: "useEnumInitializers",
    name: "use-enum-initializers",
    category: "Style",
    description:
      "Require that each enum member value be explicitly initialized.\nSee https://biomejs.dev/linter/rules/use-enum-initializers",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-enum-initializers/",
  },
  {
    id: "useErrorMessage",
    name: "use-error-message",
    category: "Suspicious",
    description:
      "Enforce passing a message value when creating a built-in error.\nSee https://biomejs.dev/linter/rules/use-error-message",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/use-error-message/",
  },
  {
    id: "useExhaustiveDependencies",
    name: "use-exhaustive-dependencies",
    category: "Correctness",
    description:
      "Enforce all dependencies are correctly specified in a React hook.\nSee https://biomejs.dev/linter/rules/use-exhaustive-dependencies",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-exhaustive-dependencies/",
  },
  {
    id: "useExhaustiveSwitchCases",
    name: "use-exhaustive-switch-cases",
    category: "Nursery",
    description:
      "Require switch-case statements to be exhaustive.\nSee https://biomejs.dev/linter/rules/use-exhaustive-switch-cases",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/nursery/use-exhaustive-switch-cases/",
  },
  {
    id: "useExplicitLengthCheck",
    name: "use-explicit-length-check",
    category: "Style",
    description:
      "Enforce explicitly comparing the length, size, byteLength or byteOffset property of a value.\nSee https://biomejs.dev/linter/rules/use-explicit-length-check",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-explicit-length-check/",
  },
  {
    id: "useExplicitType",
    name: "use-explicit-type",
    category: "Nursery",
    description:
      "Enforce types in functions, methods, variables, and parameters.\nSee https://biomejs.dev/linter/rules/use-explicit-type",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-explicit-type/",
  },
  {
    id: "useExponentiationOperator",
    name: "use-exponentiation-operator",
    category: "Style",
    description:
      "Disallow the use of Math.pow in favor of the ** operator.\nSee https://biomejs.dev/linter/rules/use-exponentiation-operator",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-exponentiation-operator/",
  },
  {
    id: "useExportType",
    name: "use-export-type",
    category: "Style",
    description:
      "Promotes the use of export type for types.\nSee https://biomejs.dev/linter/rules/use-export-type",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-export-type/",
  },
  {
    id: "useExportsLast",
    name: "use-exports-last",
    category: "Style",
    description:
      "Require that all exports are declared after all non-export statements.\nSee https://biomejs.dev/linter/rules/use-exports-last",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-exports-last/",
  },
  {
    id: "useFilenamingConvention",
    name: "use-filenaming-convention",
    category: "Style",
    description:
      "Enforce naming conventions for JavaScript and TypeScript filenames.\nSee https://biomejs.dev/linter/rules/use-filenaming-convention",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-filenaming-convention/",
  },
  {
    id: "useFlatMap",
    name: "use-flat-map",
    category: "Complexity",
    description:
      "Promotes the use of .flatMap() when map().flat() are used together.\nSee https://biomejs.dev/linter/rules/use-flat-map",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-flat-map/",
  },
  {
    id: "useFocusableInteractive",
    name: "use-focusable-interactive",
    category: "A11y",
    description:
      "Elements with an interactive role and interaction handlers must be focusable.\nSee https://biomejs.dev/linter/rules/use-focusable-interactive",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-focusable-interactive/",
  },
  {
    id: "useForOf",
    name: "use-for-of",
    category: "Style",
    description:
      "Prefer using for...of loops over standard for loops where possible.\nSee https://biomejs.dev/linter/rules/use-for-of",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-for-of/",
  },
  {
    id: "useFragmentSyntax",
    name: "use-fragment-syntax",
    category: "Style",
    description:
      "This rule enforces the use of \\<>...\\</> over \\<Fragment>...\\</Fragment>.\nSee https://biomejs.dev/linter/rules/use-fragment-syntax",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-fragment-syntax/",
  },
  {
    id: "useGenericFontNames",
    name: "use-generic-font-names",
    category: "A11y",
    description:
      "Disallow a missing generic family keyword within font families.\nSee https://biomejs.dev/linter/rules/use-generic-font-names",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-generic-font-names/",
  },
  {
    id: "useGetterReturn",
    name: "use-getter-return",
    category: "Suspicious",
    description:
      "Enforce get methods to always return a value.\nSee https://biomejs.dev/linter/rules/use-getter-return",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/use-getter-return/",
  },
  {
    id: "useGoogleFontDisplay",
    name: "use-google-font-display",
    category: "Suspicious",
    description:
      "Enforces the use of a recommended display strategy with Google Fonts.\nSee https://biomejs.dev/linter/rules/use-google-font-display",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-google-font-display/",
  },
  {
    id: "useGoogleFontPreconnect",
    name: "use-google-font-preconnect",
    category: "Performance",
    description:
      "Ensure the preconnect attribute is used when using Google Fonts.\nSee https://biomejs.dev/linter/rules/use-google-font-preconnect",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/performance/use-google-font-preconnect/",
  },
  {
    id: "useGuardForIn",
    name: "use-guard-for-in",
    category: "Suspicious",
    description:
      "Require for-in loops to include an if statement.\nSee https://biomejs.dev/linter/rules/use-guard-for-in",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/use-guard-for-in/",
  },
  {
    id: "useHeadingContent",
    name: "use-heading-content",
    category: "A11y",
    description:
      "Enforce that heading elements (h1, h2, etc.) have content and that the content is accessible to screen readers. Accessible means that it is not hidden using the aria-hidden prop.\nSee https://biomejs.dev/linter/rules/use-heading-content",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-heading-content/",
  },
  {
    id: "useHookAtTopLevel",
    name: "use-hook-at-top-level",
    category: "Correctness",
    description:
      "Enforce that all React hooks are being called from the Top Level component functions.\nSee https://biomejs.dev/linter/rules/use-hook-at-top-level",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-hook-at-top-level/",
  },
  {
    id: "useHtmlLang",
    name: "use-html-lang",
    category: "A11y",
    description:
      "Enforce that html element has lang attribute.\nSee https://biomejs.dev/linter/rules/use-html-lang",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-html-lang/",
  },
  {
    id: "useIframeTitle",
    name: "use-iframe-title",
    category: "A11y",
    description:
      "Enforces the usage of the attribute title for the element iframe.\nSee https://biomejs.dev/linter/rules/use-iframe-title",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-iframe-title/",
  },
  {
    id: "useImportExtensions",
    name: "use-import-extensions",
    category: "Correctness",
    description:
      "Enforce file extensions for relative imports.\nSee https://biomejs.dev/linter/rules/use-import-extensions",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-import-extensions/",
  },
  {
    id: "useImportType",
    name: "use-import-type",
    category: "Style",
    description:
      "Promotes the use of import type for types.\nSee https://biomejs.dev/linter/rules/use-import-type",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-import-type/",
  },
  {
    id: "useIndexOf",
    name: "use-index-of",
    category: "Complexity",
    description:
      "Prefer Array#{indexOf,lastIndexOf}() over Array#{findIndex,findLastIndex}() when looking for the index of an item.\nSee https://biomejs.dev/linter/rules/use-index-of",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-index-of/",
  },
  {
    id: "useIsArray",
    name: "use-is-array",
    category: "Suspicious",
    description:
      "Use Array.isArray() instead of instanceof Array.\nSee https://biomejs.dev/linter/rules/use-is-array",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/use-is-array/",
  },
  {
    id: "useIsNan",
    name: "use-is-nan",
    category: "Correctness",
    description:
      "Require calls to isNaN() when checking for NaN.\nSee https://biomejs.dev/linter/rules/use-is-nan",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/use-is-nan/",
  },
  {
    id: "useIterableCallbackReturn",
    name: "use-iterable-callback-return",
    category: "Suspicious",
    description:
      "Enforce consistent return values in iterable callbacks.\nSee https://biomejs.dev/linter/rules/use-iterable-callback-return",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-iterable-callback-return/",
  },
  {
    id: "useJsxKeyInIterable",
    name: "use-jsx-key-in-iterable",
    category: "Correctness",
    description:
      "Disallow missing key props in iterators/collection literals.\nSee https://biomejs.dev/linter/rules/use-jsx-key-in-iterable",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-jsx-key-in-iterable/",
  },
  {
    id: "useKeyWithClickEvents",
    name: "use-key-with-click-events",
    category: "A11y",
    description:
      "Enforce onClick is accompanied by at least one of the following: onKeyUp, onKeyDown, onKeyPress.\nSee https://biomejs.dev/linter/rules/use-key-with-click-events",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-key-with-click-events/",
  },
  {
    id: "useKeyWithMouseEvents",
    name: "use-key-with-mouse-events",
    category: "A11y",
    description:
      "Enforce onMouseOver / onMouseOut are accompanied by onFocus / onBlur.\nSee https://biomejs.dev/linter/rules/use-key-with-mouse-events",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-key-with-mouse-events/",
  },
  {
    id: "useLiteralEnumMembers",
    name: "use-literal-enum-members",
    category: "Style",
    description:
      "Require all enum members to be literal values.\nSee https://biomejs.dev/linter/rules/use-literal-enum-members",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-literal-enum-members/",
  },
  {
    id: "useLiteralKeys",
    name: "use-literal-keys",
    category: "Complexity",
    description:
      "Enforce the usage of a literal access to properties over computed property access.\nSee https://biomejs.dev/linter/rules/use-literal-keys",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-literal-keys/",
  },
  {
    id: "useMediaCaption",
    name: "use-media-caption",
    category: "A11y",
    description:
      "Enforces that audio and video elements must have a track for captions.\nSee https://biomejs.dev/linter/rules/use-media-caption",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-media-caption/",
  },
  {
    id: "useNamespaceKeyword",
    name: "use-namespace-keyword",
    category: "Suspicious",
    description:
      "Require using the namespace keyword over the module keyword to declare TypeScript namespaces.\nSee https://biomejs.dev/linter/rules/use-namespace-keyword",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-namespace-keyword/",
  },
  {
    id: "useNamingConvention",
    name: "use-naming-convention",
    category: "Style",
    description:
      "Enforce naming conventions for everything across a codebase.\nSee https://biomejs.dev/linter/rules/use-naming-convention",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-naming-convention/",
  },
  {
    id: "useNodeAssertStrict",
    name: "use-node-assert-strict",
    category: "Style",
    description:
      "Promotes the usage of node:assert/strict over node:assert.\nSee https://biomejs.dev/linter/rules/use-node-assert-strict",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-node-assert-strict/",
  },
  {
    id: "useNodejsImportProtocol",
    name: "use-nodejs-import-protocol",
    category: "Style",
    description:
      "Enforces using the node: protocol for Node.js builtin modules.\nSee https://biomejs.dev/linter/rules/use-nodejs-import-protocol",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-nodejs-import-protocol/",
  },
  {
    id: "useNumberNamespace",
    name: "use-number-namespace",
    category: "Style",
    description:
      "Use the Number properties instead of global ones.\nSee https://biomejs.dev/linter/rules/use-number-namespace",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-number-namespace/",
  },
  {
    id: "useNumberToFixedDigitsArgument",
    name: "use-number-to-fixed-digits-argument",
    category: "Suspicious",
    description:
      "Enforce using the digits argument with Number#toFixed().\nSee https://biomejs.dev/linter/rules/use-number-to-fixed-digits-argument",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/suspicious/use-number-to-fixed-digits-argument/",
  },
  {
    id: "useNumericLiterals",
    name: "use-numeric-literals",
    category: "Complexity",
    description:
      "Disallow parseInt() and Number.parseInt() in favor of binary, octal, and hexadecimal literals.\nSee https://biomejs.dev/linter/rules/use-numeric-literals",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-numeric-literals/",
  },
  {
    id: "useNumericSeparators",
    name: "use-numeric-separators",
    category: "Style",
    description:
      "Enforce the use of numeric separators in numeric literals.\nSee https://biomejs.dev/linter/rules/use-numeric-separators",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-numeric-separators/",
  },
  {
    id: "useObjectSpread",
    name: "use-object-spread",
    category: "Style",
    description:
      "Prefer object spread over Object.assign() when constructing new objects.\nSee https://biomejs.dev/linter/rules/use-object-spread",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-object-spread/",
  },
  {
    id: "useOptionalChain",
    name: "use-optional-chain",
    category: "Complexity",
    description:
      "Enforce using concise optional chain instead of chained logical expressions.\nSee https://biomejs.dev/linter/rules/use-optional-chain",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-optional-chain/",
  },
  {
    id: "useParseIntRadix",
    name: "use-parse-int-radix",
    category: "Correctness",
    description:
      "Enforce the consistent use of the radix argument when using parseInt().\nSee https://biomejs.dev/linter/rules/use-parse-int-radix",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/use-parse-int-radix/",
  },
  {
    id: "useReadonlyClassProperties",
    name: "use-readonly-class-properties",
    category: "Style",
    description:
      "Enforce marking members as readonly if they are never modified outside the constructor.\nSee https://biomejs.dev/linter/rules/use-readonly-class-properties",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-readonly-class-properties/",
  },
  {
    id: "useRegexLiterals",
    name: "use-regex-literals",
    category: "Complexity",
    description:
      "Enforce the use of the regular expression literals instead of the RegExp constructor if possible.\nSee https://biomejs.dev/linter/rules/use-regex-literals",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-regex-literals/",
  },
  {
    id: "useSelfClosingElements",
    name: "use-self-closing-elements",
    category: "Style",
    description:
      "Prevent extra closing tags for components without children.\nSee https://biomejs.dev/linter/rules/use-self-closing-elements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-self-closing-elements/",
  },
  {
    id: "useSemanticElements",
    name: "use-semantic-elements",
    category: "A11y",
    description:
      "It detects the use of role attributes in JSX elements and suggests using semantic elements instead.\nSee https://biomejs.dev/linter/rules/use-semantic-elements",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-semantic-elements/",
  },
  {
    id: "useShorthandAssign",
    name: "use-shorthand-assign",
    category: "Style",
    description:
      "Require assignment operator shorthand where possible.\nSee https://biomejs.dev/linter/rules/use-shorthand-assign",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-shorthand-assign/",
  },
  {
    id: "useShorthandFunctionType",
    name: "use-shorthand-function-type",
    category: "Style",
    description:
      "Enforce using function types instead of object type with call signatures.\nSee https://biomejs.dev/linter/rules/use-shorthand-function-type",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/style/use-shorthand-function-type/",
  },
  {
    id: "useSimpleNumberKeys",
    name: "use-simple-number-keys",
    category: "Complexity",
    description:
      "Disallow number literal object member names which are not base 10 or use underscore as separator.\nSee https://biomejs.dev/linter/rules/use-simple-number-keys",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/use-simple-number-keys/",
  },
  {
    id: "useSimplifiedLogicExpression",
    name: "use-simplified-logic-expression",
    category: "Complexity",
    description:
      "Discard redundant terms from logical expressions.\nSee https://biomejs.dev/linter/rules/use-simplified-logic-expression",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/complexity/use-simplified-logic-expression/",
  },
  {
    id: "useSingleJsDocAsterisk",
    name: "use-single-js-doc-asterisk",
    category: "Correctness",
    description:
      "Enforce JSDoc comment lines to start with a single asterisk, except for the first one.\nSee https://biomejs.dev/linter/rules/use-single-js-doc-asterisk",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-single-js-doc-asterisk/",
  },
  {
    id: "useSingleVarDeclarator",
    name: "use-single-var-declarator",
    category: "Style",
    description:
      "Disallow multiple variable declarations in the same variable statement.\nSee https://biomejs.dev/linter/rules/use-single-var-declarator",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-single-var-declarator/",
  },
  {
    id: "useSortedClasses",
    name: "use-sorted-classes",
    category: "Nursery",
    description:
      "Enforce the sorting of CSS utility classes.\nSee https://biomejs.dev/linter/rules/use-sorted-classes",
    recommended: false,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/nursery/use-sorted-classes/",
  },
  {
    id: "useStrictMode",
    name: "use-strict-mode",
    category: "Suspicious",
    description:
      'Enforce the use of the directive "use strict" in script files.\nSee https://biomejs.dev/linter/rules/use-strict-mode',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/suspicious/use-strict-mode/",
  },
  {
    id: "useSymbolDescription",
    name: "use-symbol-description",
    category: "Style",
    description:
      "Require a description parameter for the Symbol().\nSee https://biomejs.dev/linter/rules/use-symbol-description",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-symbol-description/",
  },
  {
    id: "useTemplate",
    name: "use-template",
    category: "Style",
    description:
      "Prefer template literals over string concatenation.\nSee https://biomejs.dev/linter/rules/use-template",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-template/",
  },
  {
    id: "useThrowNewError",
    name: "use-throw-new-error",
    category: "Style",
    description:
      "Require new when throwing an error.\nSee https://biomejs.dev/linter/rules/use-throw-new-error",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-throw-new-error/",
  },
  {
    id: "useThrowOnlyError",
    name: "use-throw-only-error",
    category: "Style",
    description:
      "Disallow throwing non-Error values.\nSee https://biomejs.dev/linter/rules/use-throw-only-error",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-throw-only-error/",
  },
  {
    id: "useTopLevelRegex",
    name: "use-top-level-regex",
    category: "Performance",
    description:
      "Require regex literals to be declared at the top level.\nSee https://biomejs.dev/linter/rules/use-top-level-regex",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/performance/use-top-level-regex/",
  },
  {
    id: "useTrimStartEnd",
    name: "use-trim-start-end",
    category: "Style",
    description:
      "Enforce the use of String.trimStart() and String.trimEnd() over String.trimLeft() and String.trimRight().\nSee https://biomejs.dev/linter/rules/use-trim-start-end",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/style/use-trim-start-end/",
  },
  {
    id: "useUniqueElementIds",
    name: "use-unique-element-ids",
    category: "Correctness",
    description:
      "Prevent the usage of static string literal id attribute on elements.\nSee https://biomejs.dev/linter/rules/use-unique-element-ids",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-unique-element-ids/",
  },
  {
    id: "useValidAnchor",
    name: "use-valid-anchor",
    category: "A11y",
    description:
      "Enforce that all anchors are valid, and they are navigable elements.\nSee https://biomejs.dev/linter/rules/use-valid-anchor",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-valid-anchor/",
  },
  {
    id: "useValidAriaProps",
    name: "use-valid-aria-props",
    category: "A11y",
    description:
      "Ensures that ARIA properties aria-* are all valid.\nSee https://biomejs.dev/linter/rules/use-valid-aria-props",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-valid-aria-props/",
  },
  {
    id: "useValidAriaRole",
    name: "use-valid-aria-role",
    category: "A11y",
    description:
      "Elements with ARIA roles must use a valid, non-abstract ARIA role.\nSee https://biomejs.dev/linter/rules/use-valid-aria-role",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-valid-aria-role/",
  },
  {
    id: "useValidAriaValues",
    name: "use-valid-aria-values",
    category: "A11y",
    description:
      "Enforce that ARIA state and property values are valid.\nSee https://biomejs.dev/linter/rules/use-valid-aria-values",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-valid-aria-values/",
  },
  {
    id: "useValidAutocomplete",
    name: "use-valid-autocomplete",
    category: "A11y",
    description:
      "Use valid values for the autocomplete attribute on input elements.\nSee https://biomejs.dev/linter/rules/use-valid-autocomplete",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-valid-autocomplete/",
  },
  {
    id: "useValidForDirection",
    name: "use-valid-for-direction",
    category: "Correctness",
    description:
      'Enforce "for" loop update clause moving the counter in the right direction.\nSee https://biomejs.dev/linter/rules/use-valid-for-direction',
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl:
      "https://biomejs.dev/linter/rules/correctness/use-valid-for-direction/",
  },
  {
    id: "useValidLang",
    name: "use-valid-lang",
    category: "A11y",
    description:
      "Ensure that the attribute passed to the lang attribute is a correct ISO language and/or country.\nSee https://biomejs.dev/linter/rules/use-valid-lang",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/a11y/use-valid-lang/",
  },
  {
    id: "useValidTypeof",
    name: "use-valid-typeof",
    category: "Correctness",
    description:
      "This rule checks that the result of a typeof expression is compared to a valid value.\nSee https://biomejs.dev/linter/rules/use-valid-typeof",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/use-valid-typeof/",
  },
  {
    id: "useWhile",
    name: "use-while",
    category: "Complexity",
    description:
      "Enforce the use of while loops instead of for loops when the initializer and update expressions are not needed.\nSee https://biomejs.dev/linter/rules/use-while",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/complexity/use-while/",
  },
  {
    id: "useYield",
    name: "use-yield",
    category: "Correctness",
    description:
      "Require generator functions to contain yield.\nSee https://biomejs.dev/linter/rules/use-yield",
    recommended: true,
    fixable: false,
    version: "2.0.4",
    docUrl: "https://biomejs.dev/linter/rules/correctness/use-yield/",
  },
];

export function getCategories(): BiomeRule["category"][] {
  return [
    "A11y",
    "Complexity",
    "Correctness",
    "Nursery",
    "Performance",
    "Security",
    "Style",
    "Suspicious",
  ];
}
