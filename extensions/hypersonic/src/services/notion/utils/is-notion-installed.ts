import { getApplications } from '@raycast/api'

export async function isNotionInstalled(): Promise<boolean> {
  const applications = await getApplications()
  return applications.some((application) => application.name === 'Notion')
}
