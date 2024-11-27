const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/

export function isPureDate(dateString: string | null | undefined): boolean {
  return !!dateString && dateString.match(dateOnlyRegex) != null
}

export function stringToDate(dateString: string | null): Date | null {
  if (isPureDate(dateString)) {
    return new Date(`${dateString}T00:00:00.000`)
  }

  if (dateString) {
    return new Date(dateString)
  }

  return null
}
