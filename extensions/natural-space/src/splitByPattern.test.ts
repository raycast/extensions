import { splitByPattern } from './splitByPattern'

describe('find chunks', () => {
  it('should find chunks of URL', () => {
    expect(splitByPattern('1.1.1.1')).toEqual([['1.1.1.1', 'ignore']])
    expect(splitByPattern('127.0.0.1')).toEqual([['127.0.0.1', 'ignore']])
    expect(splitByPattern('apple.com')).toEqual([['apple.com', 'ignore']])
    expect(splitByPattern('www.apple.com')).toEqual([['www.apple.com', 'ignore']])
    expect(splitByPattern('http://localhost')).toEqual([['http://localhost', 'ignore']])
    expect(splitByPattern('http://www.apple.com')).toEqual([['http://www.apple.com', 'ignore']])
    expect(splitByPattern('https://www.apple.com')).toEqual([['https://www.apple.com', 'ignore']])
  })

  // it('should find chunks of URL', () => {
  //   expect(findChunks('https://www.apple.com')).toEqual([['https://www.apple.com', true]])
  // })
})
