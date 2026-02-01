import type { Skill } from "./types"

const SKILLS_SH_BASE_URL = "https://skills.sh"

export interface SearchSkill {
  id: string
  name: string
  installs: number
  topSource: string | null
}

export interface SearchResponse {
  query: string
  searchType: string
  skills: SearchSkill[]
  count: number
  duration_ms: number
}

export interface SkillsResponse {
  skills: SearchSkill[]
  hasMore: boolean
}

/**
 * Search skills from skills.sh
 */
export async function searchSkills(query: string, limit = 50): Promise<Skill[]> {
  if (query.length < 2) {
    return []
  }

  try {
    const url = `${SKILLS_SH_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to search skills: ${response.statusText}`)
    }

    const data = (await response.json()) as SearchResponse

    return data.skills.map((skill) => {
      const ownerRepo = skill.topSource ? parseOwnerRepo(skill.topSource) : null

      return {
        id: skill.id,
        name: skill.name,
        description: "", // Description not in search results
        owner: ownerRepo?.owner,
        repo: ownerRepo?.repo,
        installCount: skill.installs,
        installCommand: skill.topSource
          ? `npx skills add ${skill.topSource}@${skill.id}`
          : `npx skills add ${skill.id}`,
        url: skill.topSource ? `https://skills.sh/${skill.topSource}/${skill.id}` : `https://skills.sh/${skill.id}`,
        repositoryUrl: ownerRepo ? `https://github.com/${skill.topSource}` : undefined,
        tags: [],
        source: "skills.sh" as const,
      }
    })
  } catch (error) {
    console.error("Error searching skills:", error)
    throw error
  }
}

/**
 * Fetch popular skills from skills.sh
 */
export async function fetchPopularSkills(
  limit = 50,
  sort: "all-time" | "weekly" | "monthly" = "all-time"
): Promise<Skill[]> {
  try {
    const url = `${SKILLS_SH_BASE_URL}/api/skills?limit=${limit}&sort=${sort}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch popular skills: ${response.statusText}`)
    }

    const data = (await response.json()) as SkillsResponse

    return data.skills.map((skill) => {
      const ownerRepo = skill.topSource ? parseOwnerRepo(skill.topSource) : null

      return {
        id: skill.id,
        name: skill.name,
        description: "", // Description not in API response
        owner: ownerRepo?.owner,
        repo: ownerRepo?.repo,
        installCount: skill.installs,
        installCommand: skill.topSource
          ? `npx skills add ${skill.topSource}@${skill.id}`
          : `npx skills add ${skill.id}`,
        url: skill.topSource ? `https://skills.sh/${skill.topSource}/${skill.id}` : `https://skills.sh/${skill.id}`,
        repositoryUrl: ownerRepo ? `https://github.com/${skill.topSource}` : undefined,
        tags: [],
        source: "skills.sh" as const,
      }
    })
  } catch (error) {
    console.error("Error fetching popular skills:", error)
    throw error
  }
}

function parseOwnerRepo(ownerRepo: string): { owner: string; repo: string } | null {
  const match = ownerRepo.match(/^([^/]+)\/([^/]+)$/)
  if (match && match[1] && match[2]) {
    return { owner: match[1], repo: match[2] }
  }
  return null
}
