import { Cache, closeMainWindow } from '@raycast/api'
import { runAppleScript } from '@raycast/utils'

export default class HammerspoonDoc {
  static index: { [path: string]: HammerspoonDoc } = {}
  static cache = new Cache()

  constructor(public path: string = '') {
    return (HammerspoonDoc.index[this.path] = HammerspoonDoc.index[this.path] ?? this)
  }

  private get doc() {
    return this.path.replace(':', '.')
  }

  get breadcrumbs() {
    return this.doc.split('.')
  }

  get parent() {
    return this.breadcrumbs.slice(0, -1).join('.')
  }

  get module() {
    return (this.isModule ? this.path : this.parent).slice(1)
  }

  get name() {
    return this.breadcrumbs.pop() ?? ''
  }

  get code() {
    return this.path.slice(1)
  }

  get markdown() {
    return HammerspoonDoc.cache.get(this.doc)
  }

  set markdown(value: string | undefined) {
    if (value) HammerspoonDoc.cache.set(this.doc, value)
    else HammerspoonDoc.cache.remove(this.doc)
  }

  private _fetch?: Promise<void>
  fetch(): Promise<void> {
    return this.markdown
      ? Promise.resolve()
      : (this._fetch =
          this._fetch ??
          runAppleScript(`
        tell application "Hammerspoon"
          execute lua code "
            return hs.doc${this.doc}
          "
        end tell
      `).then((result) => {
            this.markdown = result
          }))
  }

  documentation() {
    runAppleScript(`
      tell application "Hammerspoon"
        execute lua code "
          local hsApp = hs.application.get(hs.processInfo.bundleID)

          if hsApp then
            hsApp:activate()
            hs.doc.hsdocs.help('${this.module}')
            local hsDocsWindow = hsApp:findWindow('Hammerspoon docs')

            if hsDocsWindow then
              hsDocsWindow:focus()
            end
          end
        "
      end tell
    `)

    closeMainWindow()
  }

  get url(): string {
    const hash = this.isModule ? '' : `#${this.name}`
    return `https://www.hammerspoon.org/docs/${this.module}.html${hash}`
  }

  get overview(): string | undefined {
    return this.markdown?.match(/([^[].*\n+)+/)?.[0]
  }

  get sections(): { [title: string]: { [path: string]: HammerspoonDoc } } {
    return (
      this.markdown?.match(/^\[.*\]\n(?:.+\n?)*/gm)?.reduce((result, section) => {
        const lines = section.split('\n').filter((line) => line)
        const title = lines.shift() ?? '[unknown]'

        return {
          ...result,
          [title]: lines.reduce((result, line) => {
            const path = line.includes('.') ? `.${line.match(/[\w.:]+/)?.[0] ?? ''}` : `${this.path}.${line}`

            return {
              ...result,
              [path]: new HammerspoonDoc(path)
            }
          }, {})
        }
      }, {}) ?? {}
    )
  }

  get isModule(): boolean {
    return Object.entries(this.sections).length > 0
  }
}
