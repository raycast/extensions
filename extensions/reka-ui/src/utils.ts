import { REKA_COMPONENTS_DOCS_BASE_URL } from './constants'

export const parseComponentNameFromFilename = (filename: string) =>
  filename
    .replace('.md', '')
    .split('-')
    .map((w) => w.charAt(0).toLocaleUpperCase() + w.slice(1))
    .join(' ')

export const getComponentUrlFromFilename = (filename: string) => {
  const slug = filename.replace('.md', '')

  return REKA_COMPONENTS_DOCS_BASE_URL + `/${slug}`
}

export const parseComponentMetaFromGhJson = (json: object) => {
  const base64 = (json as Record<string, unknown>).content
  const base64WithoutNewLines = base64.replaceAll('\\n', '')
  const markdown = Buffer.from(base64WithoutNewLines, 'base64').toString()
  const markdownLines = markdown.split(/\r?\n/)

  const description = parseDescription(markdownLines)
  const anatomy = parseAnatomyBlock(markdownLines)
  const features = parseFeatures(markdownLines)
  return {
    description,
    anatomy,
    features,
  }
}

export function parseAnatomyBlock(markdownLines: string[]) {
  let inside = false
  let startingAnatomy = false
  const contents: string[] = []
  for (let i = 0; i < markdownLines.length; i++) {
    const chunk = markdownLines[i]
    if (!chunk) continue

    if (chunk.includes('# Anatomy')) {
      startingAnatomy = true
      continue
    }

    if (startingAnatomy && chunk.includes('<template>')) {
      inside = true
      contents.push(chunk)
      continue
    }

    if (inside && chunk.includes('</template>')) {
      contents.push(chunk)
      break
    }

    if (inside) {
      contents.push(chunk)
      continue
    }
  }

  return contents.join('\n')
}

export function parseDescription(markdownLines: string[]) {
  for (let i = 0; i < markdownLines.length; i++) {
    const line = markdownLines[i]
    if (!line) continue

    if (line.includes('description: ')) {
      const split = line.split(' ')
      split.shift()
      return split.join(' ')
    }
  }

  return 'No description found'
}

export function parseFeatures(markdownLines: string[]) {
  let inside = false
  let contents: string[] = []
  for (let i = 0; i < markdownLines.length; i++) {
    const chunk = markdownLines[i]
    if (!chunk) continue

    if (chunk.includes(':features="[')) {
      // case for 1 or 2 features
      if (chunk.endsWith(']"') || chunk.endsWith('>')) {
        const split = chunk.split(/:features="\[(.*?)\]"/)
        const featuresString = removeHtmlTags(split[1]?.replaceAll("'", '').replaceAll('"', ''))
        if (!featuresString) break

        contents = featuresString.split(',')
        break
      }

      inside = true
      continue
    }

    if (inside && chunk.includes(']')) {
      break
    }

    if (inside) {
      contents.push(removeHtmlTags(chunk.trim().replaceAll("'", '').replaceAll(',', '')))
      continue
    }
  }

  function removeHtmlTags(string: string) {
    return string.replaceAll(/<.+?>/g, '')
  }

  return contents
}
