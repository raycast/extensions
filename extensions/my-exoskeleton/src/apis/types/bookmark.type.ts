export interface BookmarkPreference {
  bookmarkSheetIds: string
  bookmarkOauthClientKey: string
}

export interface Spreadsheets {
  spreadsheetId: string
  properties: {
    title: string
    locale: string
    autoRecalc: string
    timeZone: string
    defaultFormat: {
      backgroundColor: {
        red: number
        green: number
        blue: number
      }
      padding: {
        top: number
        right: number
        bottom: number
        left: number
      }
      verticalAlignment: string
      wrapStrategy: string
      textFormat: {
        foregroundColor: any
        fontFamily: string
        fontSize: number
        bold: boolean
        italic: boolean
        strikethrough: boolean
        underline: boolean
        foregroundColorStyle: {
          rgbColor: any
        }
      }
      backgroundColorStyle: {
        rgbColor: {
          red: number
          green: number
          blue: number
        }
      }
    }
    spreadsheetTheme: {
      primaryFontFamily: string
      themeColors: {
        colorType: string
        color: {
          rgbColor: {
            red?: number
            green?: number
            blue?: number
          }
        }
      }[]
    }
  }
  sheets: {
    properties: sheetProperties
  }[]
  spreadsheetUrl: string
}

export interface sheetProperties {
  sheetId: number
  title: string
  index: number
  sheetType: string
  gridProperties: {
    rowCount: number
    columnCount: number
  }
}

export interface SheetValues {
  range: string
  majorDimension: string
  // values: Array<Array<string>>
  values: [[string]]
}
