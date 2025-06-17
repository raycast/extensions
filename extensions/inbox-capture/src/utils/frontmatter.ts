export function generateFrontmatter(): string {
  return `---
status: active
type: inbox
next-steps: waiting-for-Claude
---`;
}

export function generateTimestampFilename(): string {
  const now = new Date();

  // Format: YYYY-MM-DD-HHMMSS
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}${minutes}${seconds}.md`;
}
