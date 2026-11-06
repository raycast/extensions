const countFormat = new Intl.NumberFormat()
const regionNames = new Intl.DisplayNames(undefined, { type: "region" })

/** The offset from an ASCII capital to its regional indicator, two of which draw a flag. */
const FLAG_OFFSET = 127397

export function formatCount(value: number) {
  return countFormat.format(value)
}

/** A country from its ISO code, such as PL, with its flag. */
export function formatCountry(code: string) {
  const flag = String.fromCodePoint(...[...code].map(letter => letter.charCodeAt(0) + FLAG_OFFSET))
  return `${flag} ${regionNames.of(code)}`
}

/** A rate the API answers in percent, such as a bounce rate. Null when no session counts. */
export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined ? "n/a" : `${Math.round(value)}%`
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "n/a"
  const rounded = Math.round(seconds)
  return rounded < 60 ? `${rounded}s` : `${Math.floor(rounded / 60)}m ${rounded % 60}s`
}

/** An amount in minor units of a currency: 14307 in USD is $143.07. */
export function formatMoney(amount: number, currency: string) {
  const format = new Intl.NumberFormat(undefined, { style: "currency", currency })
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2
  return format.format(amount / 10 ** digits)
}

/** The change against the comparison range, or nothing when that range has no base to compare. */
export function formatChange(current: number | null, previous: number | null | undefined) {
  if (current === null || previous === null || previous === undefined || previous === 0) return
  const change = Math.round(((current - previous) / previous) * 100)
  return `${change > 0 ? "+" : ""}${change}%`
}
