const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const nth = function (d: number) {
  if (d > 3 && d < 21) return 'th'
  switch (d % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export const formatDate = (dateString?: string | null) => {
  if (!dateString) return ''

  const d = new Date(dateString)
  const year = d.getFullYear()
  const date = d.getDate()
  const month = months[d.getMonth()]
  const nthStr = nth(date)
  return `${month} ${date}${nthStr}, ${year}`
}

export const cleanTitle = (title: string) => title.replace(/&#39;/, "'")
