import TurndownService from 'turndown'

const htmlTagPattern = /<\/?[a-z][\s\S]*>/i
const htmlBlockPattern = /^\s*<\/?[a-z][^>]*>/i
const quotedImageSrcPattern = /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)(\2)/gi
const unquotedImageSrcPattern = /(<img\b[^>]*\bsrc\s*=\s*)([^"'\s>]+)/gi
const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:/i

type FormatReadmeMarkdownOptions = {
  rawBaseUrl?: string
}

const turndownService = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  headingStyle: 'atx',
})

turndownService.remove(['script', 'style'])

const normalizeMarkdown = (markdown: string) =>
  markdown
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+•[ \t]+/g, ' • ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const resolveReadmeAssetUrl = (src: string, rawBaseUrl?: string) => {
  if (!rawBaseUrl || absoluteUrlPattern.test(src) || src.startsWith('//') || src.startsWith('#')) {
    return src
  }

  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`

  try {
    return src.startsWith('/') ? `${baseUrl}${src.replace(/^\/+/, '')}` : new URL(src, baseUrl).toString()
  } catch (error) {
    return src
  }
}

const absolutizeRelativeImageSources = (html: string, rawBaseUrl?: string) =>
  html
    .replace(quotedImageSrcPattern, (match, prefix: string, quote: string, src: string) => {
      return `${prefix}${quote}${resolveReadmeAssetUrl(src, rawBaseUrl)}${quote}`
    })
    .replace(unquotedImageSrcPattern, (match, prefix: string, src: string) => {
      return `${prefix}"${resolveReadmeAssetUrl(src, rawBaseUrl)}"`
    })

const formatHtmlBlock = (block: string, options: FormatReadmeMarkdownOptions) =>
  normalizeMarkdown(turndownService.turndown(absolutizeRelativeImageSources(block, options.rawBaseUrl)))

export const formatReadmeMarkdown = (readme: unknown, options: FormatReadmeMarkdownOptions = {}) => {
  if (typeof readme !== 'string' || readme.trim() === '') {
    return 'README is empty or unavailable.'
  }

  if (!htmlTagPattern.test(readme)) {
    return readme
  }

  return normalizeMarkdown(
    readme
      .split(/\n{2,}/)
      .map((block) => (htmlBlockPattern.test(block) ? formatHtmlBlock(block, options) : block))
      .join('\n\n'),
  )
}
