export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Docusaurus uses GitHub-style heading IDs: punctuation is removed before each
// remaining whitespace character becomes a hyphen. For example, "Tools & Skills"
// becomes "tools--skills", not the collapsed "tools-skills" used for item IDs.
export function docusaurusHeadingId(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2000-\u206f\u2e00-\u2e7f\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, "")
    .replace(/\s/g, "-");
}

export function pinnedRawDocumentUrl(commit, documentPath) {
  return `https://raw.githubusercontent.com/NousResearch/hermes-agent/${commit}/${documentPath}`;
}

export function sliceRequiredSection(markdown, startHeading, endHeading) {
  const start = markdown.indexOf(startHeading);
  const end = markdown.indexOf(endHeading, start + startHeading.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not find required section from "${startHeading}" to "${endHeading}"`);
  }
  return markdown.slice(start, end);
}
