import gitUrlParse from 'git-url-parse'

/**
 * Cleans a git repository URL by removing common prefixes and suffixes
 * @param url - The git repository URL to clean
 * @returns The cleaned URL without 'git+' prefix or '.git' suffix
 * @example
 * cleanGitUrl('git+https://github.com/facebook/react.git') // 'https://github.com/facebook/react'
 */
export const cleanGitUrl = (url: string): string => {
  const parsedUrl = gitUrlParse(url).toString('https')
  // Remove 'git+' prefix if present
  let cleanUrl = parsedUrl.startsWith('git+') ? parsedUrl.slice(4) : parsedUrl

  // Remove '.git' suffix if present
  cleanUrl = cleanUrl.endsWith('.git') ? cleanUrl.slice(0, -4) : cleanUrl

  return cleanUrl
}
