import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { compareVersions } from '../src/utils/version'
import { camelToKebab } from '../src/utils/string'

type BiomeSchema = {
  $defs?: Record<string, { properties?: Record<string, { description?: string }> }>
}

type BiomeRule = {
  id: string
  name: string
  category: string
  description: string
  recommended: boolean
  fixable: boolean
  version: string
  docUrl?: string
}

const schemaUrl = 'https://biomejs.dev/schemas/2.3.6/schema.json'

async function fetchSchema(): Promise<BiomeSchema> {
  const response = await fetch(schemaUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status}`)
  }
  return await response.json()
}

async function generateFallback() {
  console.log('🚀 Generating fallback rules...\n')

  // Import the version and metadata JSON files
  const ruleVersionsJson = await import('../src/data/rules-versions.json')
  const ruleMetadataJson = await import('../src/data/rules-metadata.json')

  const ruleVersionMap: Record<string, string> = ruleVersionsJson.default
  const ruleMetadataMap: Record<string, { recommended: boolean; fixable: boolean }> =
    ruleMetadataJson.default

  console.log('📥 Fetching latest schema...')
  const schema = await fetchSchema()

  const rules: BiomeRule[] = []

  const categoryMap: Record<string, string> = {
    A11y: 'A11y',
    Complexity: 'Complexity',
    Correctness: 'Correctness',
    Nursery: 'Nursery',
    Performance: 'Performance',
    Security: 'Security',
    Style: 'Style',
    Suspicious: 'Suspicious',
  }

  const defs = schema.$defs as Record<string, { properties?: Record<string, { description?: string }> }>

  if (!defs) {
    throw new Error('Invalid schema structure')
  }

  // Process each category
  for (const [categoryKey, categoryDef] of Object.entries(defs)) {
    const category = categoryMap[categoryKey]

    if (!category || !categoryDef.properties) {
      continue
    }

    for (const [ruleId, ruleSchema] of Object.entries(categoryDef.properties)) {
      // Skip "recommended" - it's not a rule, it's a config option
      if (ruleId === 'recommended') continue

      const description = ruleSchema.description || 'No description available'
      const metadata = ruleMetadataMap[ruleId] || { recommended: true, fixable: false }
      const version = ruleVersionMap[ruleId] || '2.3.6'

      rules.push({
        id: ruleId,
        name: camelToKebab(ruleId),
        category,
        description,
        recommended: metadata.recommended,
        fixable: metadata.fixable,
        version,
        docUrl: `https://biomejs.dev/linter/rules/${categoryKey.toLowerCase()}/${camelToKebab(ruleId)}/`,
      })
    }
  }

  // Sort by version descending, then by name
  const sorted = rules.sort((a, b) => {
    const versionCompare = compareVersions(b.version, a.version)
    if (versionCompare !== 0) return versionCompare
    return a.name.localeCompare(b.name)
  })

  console.log(`✨ Generated ${sorted.length} rules`)

  // Generate TypeScript file content
  const fileContent = `import { BiomeRule } from "../types/biome-schema";

export const biomeRulesFallback: BiomeRule[] = ${JSON.stringify(sorted, null, 2)};

export function getCategories(): BiomeRule["category"][] {
  return ["A11y", "Complexity", "Correctness", "Nursery", "Performance", "Security", "Style", "Suspicious"];
}
`

  const outputPath = resolve('./src/fallback/biome-rules-fallback.ts')
  writeFileSync(outputPath, fileContent)
  console.log(`📁 Written to ${outputPath}`)
  console.log('\n✅ Fallback generation complete!')
}

generateFallback().catch((error) => {
  console.error('❌ Failed to generate fallback:', error)
  process.exit(1)
})
