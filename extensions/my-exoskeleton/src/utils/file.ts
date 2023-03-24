import fs from 'fs'
import { parse } from 'csv-parse'

export const readFile = (path: string) =>
  new Promise<Buffer>((resolve, reject) =>
    fs.readFile(path, (error, buffer) => {
      if (error) {
        reject(error)
        return
      }
      resolve(buffer)
    })
  )

interface CSVCallback<T> {
  onRow: (row: T) => void
  onFinished?: () => void
}

export const readCSV = async <T>(path: string, callback: CSVCallback<T>) => {
  const fileBuffer = await readFile(path)
  const parser = parse(fileBuffer, {
    columns: true
  })
  // parser

  parser.on('readable', async () => {
    const record = parser.read()
    parser.pause()
    await callback.onRow(record)
    parser.resume()
  })

  parser.on('resume', async () => {
    const record = parser.read()
    if (record !== null) {
      parser.pause()
      await callback.onRow(record)
      parser.resume()
    } else {
      parser.end()
    }
  })

  parser.on('end', () => {
    if (callback.onFinished) {
      callback.onFinished()
    }
  })
}
