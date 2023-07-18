import type { WebDictionary } from '../types'

export const webDictionaries: WebDictionary[] = [
  {
    name: 'Cambridge Dictionary',
    lang: 'en',
    url: text => `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(text)}`,
  },
  {
    name: '法语助手',
    lang: 'fr',
    enables: ['zh-CN'],
    url: text => `https://www.frdic.com/dicts/fr/${encodeURIComponent(text)}`,
  },
]
