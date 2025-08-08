export function getSlug(name: string) {
  return name.toLowerCase().replace(/ /g, "-");
}
