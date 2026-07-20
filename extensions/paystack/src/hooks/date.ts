export const useDate = () => {
  function parseDate(date: string | Date) {
    const parsedDate = typeof date === 'string' ? new Date(date) : date
    return parsedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return { parseDate }
}
