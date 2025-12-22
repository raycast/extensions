/**
 * Utility functions for managing pinned projects
 */

import { LocalStorage } from '@raycast/api'
import type { ClaudeProject } from '../types'

const PINNED_PROJECTS_KEY = 'pinnedProjects'

interface PinnedProjectData {
  id: string
  pinOrder: number
}

/**
 * Get the list of pinned project IDs and their order
 */
async function getPinnedProjectsData(): Promise<PinnedProjectData[]> {
  const data = await LocalStorage.getItem<string>(PINNED_PROJECTS_KEY)
  if (!data) return []

  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Save the list of pinned project IDs and their order
 */
async function savePinnedProjectsData(data: PinnedProjectData[]): Promise<void> {
  await LocalStorage.setItem(PINNED_PROJECTS_KEY, JSON.stringify(data))
}

/**
 * Get the pin order for a specific project
 */
export async function getProjectPinOrder(projectId: string): Promise<number | undefined> {
  const pinnedData = await getPinnedProjectsData()
  const project = pinnedData.find(p => p.id === projectId)
  return project?.pinOrder
}

/**
 * Get all pinned project IDs
 */
export async function getPinnedProjectIds(): Promise<string[]> {
  const pinnedData = await getPinnedProjectsData()
  return pinnedData.map(p => p.id)
}

/**
 * Check if a project is pinned
 */
export async function isProjectPinned(projectId: string): Promise<boolean> {
  const pinnedData = await getPinnedProjectsData()
  return pinnedData.some(p => p.id === projectId)
}

/**
 * Pin a project
 */
export async function pinProject(projectId: string): Promise<void> {
  const pinnedData = await getPinnedProjectsData()

  // Check if already pinned
  if (pinnedData.some(p => p.id === projectId)) {
    return
  }

  // Add to the end (highest order number)
  const maxOrder = pinnedData.length > 0 ? Math.max(...pinnedData.map(p => p.pinOrder)) : -1

  pinnedData.push({
    id: projectId,
    pinOrder: maxOrder + 1,
  })

  await savePinnedProjectsData(pinnedData)
}

/**
 * Unpin a project
 */
export async function unpinProject(projectId: string): Promise<void> {
  const pinnedData = await getPinnedProjectsData()
  const filteredData = pinnedData.filter(p => p.id !== projectId)

  // Reorder remaining pinned projects to fill gaps
  const reorderedData = filteredData
    .sort((a, b) => a.pinOrder - b.pinOrder)
    .map((project, index) => ({
      ...project,
      pinOrder: index,
    }))

  await savePinnedProjectsData(reorderedData)
}

/**
 * Move a pinned project up (decrease pinOrder - higher priority)
 */
export async function moveProjectUp(projectId: string): Promise<void> {
  const pinnedData = await getPinnedProjectsData()
  const projectIndex = pinnedData.findIndex(p => p.id === projectId)

  if (projectIndex <= 0) {
    // Already at the top or not found
    return
  }

  // Swap with the project above
  const temp = pinnedData[projectIndex - 1].pinOrder
  pinnedData[projectIndex - 1].pinOrder = pinnedData[projectIndex].pinOrder
  pinnedData[projectIndex].pinOrder = temp

  // Sort by pinOrder to maintain the order
  pinnedData.sort((a, b) => a.pinOrder - b.pinOrder)

  await savePinnedProjectsData(pinnedData)
}

/**
 * Move a pinned project down (increase pinOrder - lower priority)
 */
export async function moveProjectDown(projectId: string): Promise<void> {
  const pinnedData = await getPinnedProjectsData()
  const projectIndex = pinnedData.findIndex(p => p.id === projectId)

  if (projectIndex === -1 || projectIndex >= pinnedData.length - 1) {
    // Already at the bottom or not found
    return
  }

  // Swap with the project below
  const temp = pinnedData[projectIndex + 1].pinOrder
  pinnedData[projectIndex + 1].pinOrder = pinnedData[projectIndex].pinOrder
  pinnedData[projectIndex].pinOrder = temp

  // Sort by pinOrder to maintain the order
  pinnedData.sort((a, b) => a.pinOrder - b.pinOrder)

  await savePinnedProjectsData(pinnedData)
}

/**
 * Enrich projects with pin information
 */
export async function enrichProjectsWithPinInfo(
  projects: ClaudeProject[]
): Promise<ClaudeProject[]> {
  const pinnedData = await getPinnedProjectsData()

  // Create a map for quick lookup
  const pinOrderMap = new Map<string, number>()
  pinnedData.forEach(p => {
    pinOrderMap.set(p.id, p.pinOrder)
  })

  return projects.map(project => {
    const pinOrder = pinOrderMap.get(project.id)
    return {
      ...project,
      isPinned: pinOrder !== undefined,
      pinOrder: pinOrder,
    }
  })
}
