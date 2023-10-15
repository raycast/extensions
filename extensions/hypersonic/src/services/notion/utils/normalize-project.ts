import { Project } from '@/types/project'

export const normalizeProject = ({
  page,
  titleProperty,
}: {
  page: any
  titleProperty: string
}): Project => {
  return {
    id: page.id,
    title:
      page.properties[titleProperty]?.title[0]?.text?.content || 'Untitled',
    icon:
      page?.icon?.emoji ||
      page?.icon?.external?.url ||
      page?.icon?.file?.url ||
      null,
  }
}
