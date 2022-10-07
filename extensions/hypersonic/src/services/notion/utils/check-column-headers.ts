import { PreferenceValues } from '@raycast/api'

export function checkColumnHeaders(page: any, preferences: PreferenceValues) {
  if (!page) {
    return
  }
  const properties = Object.entries(preferences)
  const missingColumns: string[] = []
  const discartedProperties = ['open_in_native_app', 'database_name']
  properties.forEach(([property, value]) => {
    if (!page.properties[value] && !discartedProperties.includes(property)) {
      missingColumns.push(value)
    }
  })
  if (missingColumns.length > 0) {
    throw new Error(`Match property name for: ${missingColumns.join(', ')}`)
  }
}
