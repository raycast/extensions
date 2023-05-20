import { findProcessorOrder } from './findProcessorOrder'
import { createOrderedProcessor, ProcessorRecord } from './orderedProcessor'
import { processors } from './processors/processors'

const noop = () => ''
const echo = (x: string) => (acc: string) => acc + x

describe('Find processor order', () => {
  it('should find processor order', () => {
    expect(
      findProcessorOrder([
        ['a', echo('a'), ['b']],
        ['b', echo('b'), ['c']],
        ['c', echo('c')],
      ])
    ).toEqual(['c', 'b', 'a'])

    const processors: ProcessorRecord[] = [
      ['a', echo('a'), ['b']],
      ['b', echo('b'), ['c']],
      ['c', echo('c')],
    ]
    expect(createOrderedProcessor(processors, findProcessorOrder(processors))('', {})).toEqual('cba')
  })

  it('should handle more complex cases', () => {
    expect(
      findProcessorOrder([
        ['a1', noop, ['b1', 'b2']],
        ['a2', noop, ['b1', 'b2']],
        ['b1', noop],
        ['b2', noop],
      ])
    ).toEqual(['b1', 'b2', 'a1', 'a2'])
  })

  it('should detect loop', () => {
    expect(() =>
      findProcessorOrder([
        ['a', noop, ['b']],
        ['b', noop, ['c']],
        ['c', noop, ['a']],
      ])
    ).toThrowError()
  })

  it('should detect duplicate', () => {
    expect(() =>
      findProcessorOrder([
        ['a', noop, ['b']],
        ['b', noop, ['c']],
        ['c', noop],
        ['a', noop, ['b']],
      ])
    ).toThrowError()
  })

  it('should detect missing dependency', () => {
    expect(() =>
      findProcessorOrder([
        ['a', noop, ['b']],
        ['b', noop, ['c']],
        ['c', noop],
        ['d', noop, ['e']],
      ])
    ).toThrowError()
  })

  it('should output the order of processors', () => {
    expect(findProcessorOrder(processors)).toEqual([
      'no full-width numbers',
      'no space before punctuations',
      'no duplicated whitespace, except leading and trailing ones',
      'use full-width brackets if they contain CJK characters',
      'use full-width quotes if they contain CJK characters',
      'ensure space between CJK and digit/letters',
      'ensure space between numbers and units (exclude exceptions)',
      'add space after units',
      'no space between CJK',
      'use preferred full-width quotes',
      'use full-width punctuation around CJK characters',
      'ensure space before left brackets',
      'use half-width punctuation between CJK brackets if no CJK found',
      'no space around full-width punctuation',
      'ensure space after some half-width punctuations',
      'ensure space around some half-width punctuations',
    ])
  })
})
