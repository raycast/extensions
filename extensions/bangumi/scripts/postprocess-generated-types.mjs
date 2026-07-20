import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const generatedPath = join(__dirname, "../src/types/generated.ts")

const SHARED_IMPORTS = [
  "RatingScoreCount",
  "RedirectResponse",
  "CharacterCollectionMutation",
  "PersonCollectionMutation",
  "IndexCollectionMutation",
  "SubjectCollectionWriteOperation",
  "SubjectListOperation",
  "PersonRevisionListOperation",
  "CharacterRevisionListOperation",
  "SubjectRevisionListOperation",
  "EpisodeRevisionListOperation",
]

const IMPORT_LINE = `import type { ${SHARED_IMPORTS.join(", ")} } from "./openapi-shared"\n\n`

const ERROR_RESPONSE_PATTERN =
  /(\n[ \t]+\/\*\* @description[^\n]*\*\/\n[ \t]+)(400|401|404|500): \{\n[ \t]+headers: \{\n[ \t]+\[name: string\]: unknown;\n[ \t]+\};\n[ \t]+content: \{\n[ \t]+"application\/json": components\["schemas"\]\["ErrorDetail"\];\n[ \t]+\};\n[ \t]+\};/g

const NO_CONTENT_RESPONSE_PATTERN =
  /(\n[ \t]+\/\*\* @description[^\n]*\*\/\n[ \t]+)(204): \{\n[ \t]+headers: \{\n[ \t]+\[name: string\]: unknown;\n[ \t]+\};\n[ \t]+content\?: never;\n[ \t]+\};/g

const REDIRECT_RESPONSE_PATTERN =
  /(\n[ \t]+\/\*\* @description Successful Response \*\/\n[ \t]+302): \{\n[ \t]+headers: \{\n[ \t]+\/\*\*[\s\S]*?\*\/\n[ \t]+Location\?: string;\n[ \t]+\[name: string\]: unknown;\n[ \t]+\};\n[ \t]+content\?: never;\n[ \t]+\};/g

const RATING_COUNT_WITH_EXAMPLES_PATTERN =
  /\{\n[ \t]+\/\*\* @example 5 \*\/\n[ \t]+1\?: number;\n[ \t]+\/\*\* @example 3 \*\/\n[ \t]+2\?: number;\n[ \t]+\/\*\* @example 4 \*\/\n[ \t]+3\?: number;\n[ \t]+\/\*\* @example 6 \*\/\n[ \t]+4\?: number;\n[ \t]+\/\*\* @example 46 \*\/\n[ \t]+5\?: number;\n[ \t]+\/\*\* @example 267 \*\/\n[ \t]+6\?: number;\n[ \t]+\/\*\* @example 659 \*\/\n[ \t]+7\?: number;\n[ \t]+\/\*\* @example 885 \*\/\n[ \t]+8\?: number;\n[ \t]+\/\*\* @example 284 \*\/\n[ \t]+9\?: number;\n[ \t]+\/\*\* @example 130 \*\/\n[ \t]+10\?: number;\n[ \t]+\}/g

const RATING_COUNT_PLAIN_PATTERN =
  /\{\n[ \t]+1\?: number;\n[ \t]+2\?: number;\n[ \t]+3\?: number;\n[ \t]+4\?: number;\n[ \t]+5\?: number;\n[ \t]+6\?: number;\n[ \t]+7\?: number;\n[ \t]+8\?: number;\n[ \t]+9\?: number;\n[ \t]+10\?: number;\n[ \t]+\}/g

const OPERATION_TYPE_ALIASES = {
  collectCharacterByCharacterIdAndUserId: "CharacterCollectionMutation",
  uncollectCharacterByCharacterIdAndUserId: "CharacterCollectionMutation",
  collectPersonByPersonIdAndUserId: "PersonCollectionMutation",
  uncollectPersonByPersonIdAndUserId: "PersonCollectionMutation",
  collectIndexByIndexIdAndUserId: "IndexCollectionMutation",
  uncollectIndexByIndexIdAndUserId: "IndexCollectionMutation",
  postUserCollection: "SubjectCollectionWriteOperation",
  patchUserCollection: "SubjectCollectionWriteOperation",
  getSubjects: "SubjectListOperation",
  getPersonRevisions: "PersonRevisionListOperation",
  getCharacterRevisions: "CharacterRevisionListOperation",
  getSubjectRevisions: "SubjectRevisionListOperation",
  getEpisodeRevisions: "EpisodeRevisionListOperation",
}

function replaceOperationBody(source, operationName, replacement) {
  const marker = `${operationName}: {`
  const start = source.indexOf(marker)
  if (start === -1) {
    return source
  }

  let depth = 0
  let started = false

  for (let i = start + operationName.length + 1; i < source.length; i++) {
    const char = source[i]
    if (char === "{") {
      depth++
      started = true
    } else if (char === "}") {
      depth--
      if (started && depth === 0) {
        const end = source[i + 1] === ";" ? i + 2 : i + 1
        return `${source.slice(0, start)}${operationName}: ${replacement};${source.slice(end)}`
      }
    }
  }

  throw new Error(`Could not find end of operation ${operationName}`)
}

function dedupeOperations(operations) {
  let output = operations

  output = output.replace(
    ERROR_RESPONSE_PATTERN,
    (_, description, status) => `${description}${status}: components["responses"]["${status}"];`,
  )

  output = output.replace(
    NO_CONTENT_RESPONSE_PATTERN,
    (_, description) => `${description}204: components["responses"]["200-no-content"];`,
  )

  output = output.replace(
    REDIRECT_RESPONSE_PATTERN,
    (_, description) => `${description}: RedirectResponse;`,
  )

  for (const [operationName, typeName] of Object.entries(OPERATION_TYPE_ALIASES)) {
    output = replaceOperationBody(output, operationName, typeName)
  }

  return output
}

function dedupeSchemas(prefix) {
  let output = prefix

  output = output.replace(RATING_COUNT_WITH_EXAMPLES_PATTERN, "RatingScoreCount")
  output = output.replace(RATING_COUNT_PLAIN_PATTERN, "RatingScoreCount")

  return output
}

function ensureSharedImport(prefix) {
  if (prefix.includes('from "./openapi-shared"')) {
    return prefix.replace(
      /import type \{[^}]+\} from "\.\/openapi-shared"\n\n/,
      IMPORT_LINE,
    )
  }

  return prefix.replace(
    /(\/\*\*\n \* This file was auto-generated by openapi-typescript\.\n \* Do not make direct changes to the file\.\n \*\/\n\n)/,
    `/**\n * This file was auto-generated by openapi-typescript.\n * Do not make direct changes to the file.\n * Run \`npm run generate-types\` to regenerate and deduplicate.\n */\n\n${IMPORT_LINE}`,
  )
}

const source = readFileSync(generatedPath, "utf8")
const operationsIndex = source.indexOf("export interface operations {")
if (operationsIndex === -1) {
  throw new Error("Could not find operations interface in generated.ts")
}

let prefix = ensureSharedImport(source.slice(0, operationsIndex))
prefix = dedupeSchemas(prefix)

const output = prefix + dedupeOperations(source.slice(operationsIndex))
writeFileSync(generatedPath, output)
