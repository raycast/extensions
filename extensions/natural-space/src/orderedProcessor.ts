import { Preferences } from './Preferences'

const debug = false // `import("@raycast/api").environment.isDevelopment` does not work

export type MetaProcessorRecord = [name: string, dependencies?: string[]]
export type Processor = (input: string, preferences: Preferences) => string
export type ProcessorRecord = [name: string, processor: Processor, dependencies?: string[]]

export const createOrderedProcessor = (records: ProcessorRecord[], order: ProcessorRecord[0][]): ProcessorRecord[1] => {
  // order processors depending on their names and dependencies
  const orderedRecords = records.sort((a, b) => {
    const [nameA] = a
    const [nameB] = b
    const indexA = order.indexOf(nameA)
    const indexB = order.indexOf(nameB)
    if (indexA > -1 && indexB > -1) return indexA - indexB
    if (indexA > -1) return -1
    if (indexB > -1) return 1
    return 0
  })

  return debug
    ? (input, preferences) =>
        orderedRecords.reduce((acc, [name, processor]) => {
          const output = processor(acc, preferences)
          console.debug([name, `"${acc}"`, `"${output}"`].join('    \n'))
          return output
        }, input)
    : (input, preferences) => orderedRecords.reduce((acc, [, processor]) => processor(acc, preferences), input)
}
