import { Preferences } from './Preferences'
import { processText } from './processText'

// Cases from https://github.com/sparanoid/chinese-copywriting-guidelines

const preferences: Preferences = {
  useStraightQuotesForCJK: true,
}

describe('processText', () => {
  test('handles space between Chinese and English characters', () => {
    const input = '在LeanCloud上，數據儲存是圍繞AVObject進行的。'
    const expected = '在 LeanCloud 上，數據儲存是圍繞 AVObject 進行的。'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles space between Chinese and numbers', () => {
    const input = '今天出去買菜花了5000元。'
    const expected = '今天出去買菜花了 5000 元。'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles space between numbers and units', () => {
    const input = '我家的光纖入屋寬頻有10Gbps，SSD一共有20TB。'
    const expected = '我家的光纖入屋寬頻有 10 Gbps，SSD 一共有 20 TB。'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles exceptions for degrees and percentages', () => {
    const input = '角度為90°的角，就是直角。新MacBook Pro有15%的CPU性能提升。'
    const expected = '角度為 90° 的角，就是直角。新 MacBook Pro 有 15% 的 CPU 性能提升。'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles full-width punctuation and other characters', () => {
    const input = '剛剛買了一部iPhone ，好開心！'
    const expected = '剛剛買了一部 iPhone，好開心！'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles full-width Chinese punctuation', () => {
    const input = '嗨! 你知道嘛? 今天前台的小妹跟我說 "喵" 了哎!'
    const expected = '嗨！你知道嘛？今天前台的小妹跟我說「喵」了哎！'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles half-width numbers', () => {
    const input = '這件蛋糕只賣１０００元。'
    const expected = '這件蛋糕只賣 1000 元。'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('handles half-width punctuation for complete English sentences and special nouns', () => {
    const input =
      '賈伯斯那句話是怎麼說的？「Stay hungry，stay foolish。」推薦你閱讀《Hackers＆Painters：Big Ideas from the Computer Age》，非常的有趣。'
    const expected =
      '賈伯斯那句話是怎麼說的？「Stay hungry, stay foolish.」推薦你閱讀《Hackers & Painters: Big Ideas from the Computer Age》，非常的有趣。'
    expect(processText(input, preferences)).toEqual(expected)
  })

  test('processes a complete example', () => {
    const input =
      '在LeanCloud上，數據儲存是圍繞AVObject進行的。每個AVObject都包含了與JSON兼容的key-value對應的數據。數據是schema-free的，你不需要在每個AVObject上提前指定存在哪些键，只要直接設定對應的key-value即可。'
    const expected =
      '在 LeanCloud 上，數據儲存是圍繞 AVObject 進行的。每個 AVObject 都包含了與 JSON 兼容的 key-value 對應的數據。數據是 schema-free 的，你不需要在每個 AVObject 上提前指定存在哪些键，只要直接設定對應的 key-value 即可。'
    expect(processText(input, preferences)).toEqual(expected)
  })
})
