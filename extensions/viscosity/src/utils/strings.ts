export const escape = (str: string) => {
  return str.replace(/[\\"]/g, "\\$&")
}
