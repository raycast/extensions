import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import satori from 'satori'
import { diffChars } from 'diff'
import { environment } from '@raycast/api'

const diffCache = new Map<string, Promise<string>>()
const font = fs.readFile(join(environment.assetsPath, 'RobotoMono-Regular.ttf'))

export async function getDiffSvg(from: string, to: string): Promise<string> {
  const cacheKey = `${from}=>${to}`

  if (!diffCache.has(cacheKey)) {
    diffCache.set(cacheKey, (async () => {
      const diffs = diffChars(from, to)
      const foregroundColor = environment.appearance === 'light'
        ? 'black'
        : 'white'

      const svg = await satori(
        <div style={{
          color: foregroundColor,
          display: 'flex',
          padding: 0,
          paddingTop: 10,
          margin: 0,
          fontSize: to.length > 15
            ? to.length > 24
              ? 18
              : 35
            : 50,
        }}>
          {diffs
            .filter(diff => diff.value)
            .map((diff, idx) => {
              const color = diff.added
                ? '#7AA874'
                : diff.removed
                  ? '#F96666'
                  : foregroundColor
              const background = diff.added
                ? '#7AA87430'
                : diff.removed
                  ? '#F9666620'
                  : 'transparent'
              return (
                <span
                  key={idx}
                  style={{
                    color,
                    backgroundColor: background,
                    whiteSpace: 'pre',
                  }}
               >{diff.value}</span>
              )
            })}
        </div>,
        {
          width: 520,
          height: 200,
          fonts: [
            {
              name: 'Roboto',
              data: await font,
              weight: 400,
              style: 'normal',
            },
          ],
        },
      )
      return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
    })())
  }

  return diffCache.get(cacheKey)!
}
