import { Parser } from 'htmlparser2'

export class PyPIPackage {
  name: string
  version: string
  description: string
  dateUpdated: string

  constructor(
    name: string,
    version: string,
    description: string,
    dateUpdated: string,
  ) {
    this.name = name
    this.version = version
    this.description = description
    this.dateUpdated = dateUpdated
  }
}

class Result {
  name: string = ''
  version: string = ''
  description: string = ''
  dateUpdated: string = ''

  asPackage(): PyPIPackage {
    return new PyPIPackage(
      this.name,
      this.version,
      this.description,
      this.dateUpdated,
    )
  }
}

class SearchResultParser {
  results: PyPIPackage[] = []
  private _current: Result | null = null
  private _nestAnchors: number = 0
  private _dataCallback: ((data: string) => void) | null = null

  private _matchClass(
    attrs: { name: string; value: string | undefined }[],
    name: string,
  ): boolean {
    const classAttr = attrs.find((attr) => attr.name === 'class')
    if (!classAttr) return false
    return classAttr.value?.split(' ').includes(name) || false
  }

  handleStartTag(name: string, attribs: { [name: string]: string }): void {
    const attrs = Object.entries(attribs).map(([name, value]) => ({
      name,
      value,
    }))
    if (!this._current) {
      if (name === 'a' && this._matchClass(attrs, 'package-snippet')) {
        this._current = new Result()
        this._nestAnchors = 1
      }
    } else {
      if (name === 'span' && this._matchClass(attrs, 'package-snippet__name')) {
        this._dataCallback = (data: string) => {
          this._current!.name = data
        }
      } else if (
        name === 'span' &&
        this._matchClass(attrs, 'package-snippet__created')
      ) {
        this._dataCallback = (data: string) => {
          this._current!.dateUpdated = data
        }
      } else if (
        name === 'span' &&
        this._matchClass(attrs, 'package-snippet__version')
      ) {
        this._dataCallback = (data: string) => {
          this._current!.version = data
        }
      } else if (
        name === 'p' &&
        this._matchClass(attrs, 'package-snippet__description')
      ) {
        this._dataCallback = (data: string) => {
          this._current!.description = data
        }
      } else if (name === 'a') {
        this._nestAnchors += 1
      }
    }
  }

  handleData(data: string): void {
    if (this._dataCallback) {
      this._dataCallback(data)
      this._dataCallback = null
    }
  }

  handleEndTag(name: string): void {
    if (name !== 'a' || !this._current) return

    this._nestAnchors -= 1
    if (this._nestAnchors === 0) {
      if (this._current.name && this._current.version) {
        this.results.push(this._current.asPackage())
      }
      this._current = null
    }
  }
}

export const parseSearchResults = (html: string): PyPIPackage[] => {
  const parser = new SearchResultParser()
  const htmlParser = new Parser(
    {
      onopentag(name, attribs) {
        parser.handleStartTag(name, attribs)
      },
      ontext(text) {
        parser.handleData(text)
      },
      onclosetag(tagname) {
        parser.handleEndTag(tagname)
      },
    },
    { decodeEntities: true },
  )

  htmlParser.write(html)
  htmlParser.end()

  return parser.results
}
