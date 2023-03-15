export const bytesToSize = (bytes?: number) => {
  if (bytes === undefined) return 'unknown'

  const sizes = ['Bytes', 'Ko', 'Mo', 'Go', 'To', 'Po']
  if (bytes === 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1e3)).toString(), 10)

  return `${Math.round(bytes / 1e3 ** i)} ${sizes[i] as string}`
}
