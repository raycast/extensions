/**
 * Generate the clean readable name for the license from the license slug and
 * optionally, the license version.
 *
 * @param licenseSlug - the license slug
 * @param licenseVersion - the license version
 * @return the human-friendly license name
 */
export function getLicenseName(licenseSlug: string, licenseVersion?: string) {
  if (licenseSlug === "cc0") return "CC0"
  if (licenseSlug === "pdm") return "Public Domain Mark"
  const licenseName = `CC ${licenseSlug.toUpperCase()}`

  return licenseVersion ? `${licenseName} ${licenseVersion}` : licenseName
}

/**
 * Get the Markdown to render as the primary content of the details view. This
 * contains the preview of the image with the attribution text.
 *
 * @param result - the image for which to render details
 * @return the main details content
 */
export function getDetailsMarkdown(result: Image) {
  return `![${result.title || "Image"}](${result.url})

${result.attribution}`
}
