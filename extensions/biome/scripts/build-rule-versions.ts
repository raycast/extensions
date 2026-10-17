import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { compareVersions } from '../src/utils/version'

type GitHubRelease = {
  id: number
  tag_name: string
  name?: string
  prerelease: boolean
  published_at?: string
}

type BiomeSchema = {
  $defs?: Record<string, { properties?: Record<string, { description?: string }> }>
  definitions?: Record<string, { properties?: Record<string, { description?: string }> }>
}

type RuleMetadata = {
  recommended: boolean
  fixable: boolean
}

const githubApi = 'https://api.github.com/repos/biomejs/biome/releases'
const schemaBase = 'https://biomejs.dev/schemas'
const categoryNames = ['A11y', 'Complexity', 'Correctness', 'Nursery', 'Performance', 'Security', 'Style', 'Suspicious']

async function fetchAllReleases(): Promise<GitHubRelease[]> {
  console.log('📦 Fetching all releases from GitHub...')
  try {
    const response = await fetch(githubApi)
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`)
    const releases = await response.json()
    return releases
  } catch (error) {
    console.error('Failed to fetch releases:', error)
    throw error
  }
}

function parseVersion(tagName: string): string {
  // Handle formats: "@biomejs/biome@2.3.6", "cli/v2.3.6", "v2.3.6", "2.3.6"
  return tagName.replace(/^@biomejs\/[^@]+@|^(cli\/)?v?/, '')
}

function filterStableReleases(releases: GitHubRelease[]): GitHubRelease[] {
  return releases
    .filter((r) => r.tag_name.includes('@biomejs/biome@') && !r.prerelease && !r.tag_name.includes('rc'))
    .sort((a, b) => compareVersions(parseVersion(a.tag_name), parseVersion(b.tag_name)))
}

async function fetchSchemaForVersion(version: string): Promise<BiomeSchema | null> {
  try {
    const url = `${schemaBase}/${version}/schema.json`
    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

function extractRuleIds(schema: BiomeSchema | null): Set<string> {
  if (!schema) return new Set()

  const ruleIds = new Set<string>()
  // Handle both $defs (newer) and definitions (older) schema formats
  const defs = schema['$defs'] ?? schema.definitions

  if (!defs) return ruleIds

  for (const categoryName of categoryNames) {
    const categoryDef = defs[categoryName]
    if (categoryDef?.properties) {
      for (const ruleId of Object.keys(categoryDef.properties)) {
        ruleIds.add(ruleId)
      }
    }
  }

  return ruleIds
}

function inferMetadata(ruleId: string, description: string, category: string): RuleMetadata {
  // Infer if a rule is fixable from description
  const fixableKeywords = [
    'can be automatically fixed',
    'fixable',
    'auto fix',
    'automatically fixed',
    'auto-fix',
  ]
  const lowerDesc = description.toLowerCase()
  const fixable = fixableKeywords.some((keyword) => lowerDesc.includes(keyword))

  // Infer if a rule is recommended (all except Nursery which are experimental)
  const recommended = category !== 'Nursery'

  return { recommended, fixable }
}

function extractRuleMetadata(
  schema: BiomeSchema,
  category: string,
): Record<string, RuleMetadata> {
  const metadata: Record<string, RuleMetadata> = {}
  const defs = schema['$defs'] ?? schema.definitions

  if (!defs) return metadata

  const categoryDef = defs[category]
  if (!categoryDef?.properties) return metadata

  for (const [ruleId, ruleSchema] of Object.entries(categoryDef.properties)) {
    const description = (ruleSchema as { description?: string }).description || ''
    metadata[ruleId] = inferMetadata(ruleId, description, category)
  }

  return metadata
}

async function buildRuleVersionMap(): Promise<Record<string, string>> {
  const ruleVersionMap: Record<string, string> = {}

  // Fetch all releases
  const allReleases = await fetchAllReleases()
  const stableReleases = filterStableReleases(allReleases)

  console.log(`✅ Found ${stableReleases.length} stable releases`)

  const seenRules = new Set<string>()

  // Process each stable release in chronological order
  for (const release of stableReleases) {
    const version = parseVersion(release.tag_name)
    const url = `${schemaBase}/${version}/schema.json`
    console.log(`📥 Fetching schema for v${version}... (${url})`)

    const schema = await fetchSchemaForVersion(version)
    if (!schema) {
      console.warn(`⚠️  Could not fetch schema for v${version} from ${url}`)
      continue
    }

    const ruleIds = extractRuleIds(schema)
    console.log(`   Found ${ruleIds.size} rules in v${version}`)

    // Record first appearance of each rule (skip non-rule entries)
    for (const ruleId of ruleIds) {
      // Skip "recommended" - it's not a rule, it's a config option
      if (ruleId === 'recommended') continue

      if (!seenRules.has(ruleId)) {
        ruleVersionMap[ruleId] = version
        seenRules.add(ruleId)
      }
    }
  }

  return ruleVersionMap
}

async function buildRuleMetadata(): Promise<Record<string, RuleMetadata>> {
  const allMetadata: Record<string, RuleMetadata> = {}

  // Fetch all releases
  const allReleases = await fetchAllReleases()
  const stableReleases = filterStableReleases(allReleases)

  if (stableReleases.length === 0) {
    console.warn('⚠️  No stable releases found for metadata extraction')
    return allMetadata
  }

  // Use the latest schema for metadata extraction
  const latestRelease = stableReleases[stableReleases.length - 1]
  const latestVersion = parseVersion(latestRelease.tag_name)

  console.log(`\n📥 Fetching metadata from latest schema v${latestVersion}...`)
  const latestSchema = await fetchSchemaForVersion(latestVersion)

  if (!latestSchema) {
    console.warn('⚠️  Could not fetch latest schema for metadata')
    return allMetadata
  }

  // Extract metadata for each category
  for (const category of categoryNames) {
    const categoryMetadata = extractRuleMetadata(latestSchema, category)
    Object.assign(allMetadata, categoryMetadata)
  }

  return allMetadata
}

async function main() {
  console.log('🚀 Building rule data...\n')

  try {
    // Build version map
    console.log('📍 Building version mapping...')
    const ruleVersionMap = await buildRuleVersionMap()

    console.log(`✨ Version mapping complete! (${Object.keys(ruleVersionMap).length} rules)`)

    // Build metadata
    console.log('\n📍 Building rule metadata...')
    const ruleMetadata = await buildRuleMetadata()

    console.log(`✨ Metadata extraction complete! (${Object.keys(ruleMetadata).length} rules)`)

    // Write version map to file (sorted by version descending)
    const sortedVersionMap = Object.fromEntries(
      Object.entries(ruleVersionMap)
        .sort(([, versionA], [, versionB]) => compareVersions(versionB, versionA))
    )
    const versionPath = resolve('./src/data/rules-versions.json')
    writeFileSync(versionPath, JSON.stringify(sortedVersionMap, null, 2))
    console.log(`📁 Written versions to ${versionPath}`)

    // Write metadata to file
    const metadataPath = resolve('./src/data/rules-metadata.json')
    writeFileSync(metadataPath, JSON.stringify(ruleMetadata, null, 2))
    console.log(`📁 Written metadata to ${metadataPath}`)

    console.log('\n✅ All rule data generated successfully!')
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

main()
