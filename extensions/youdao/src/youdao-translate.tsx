import crypto from 'crypto'
import { useEffect, useState } from 'react'
import fetch from 'node-fetch'
import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from '@raycast/api'

interface translateWebResult {
  value: Array<string>
  key: string
}

interface translateResult {
  translation?: Array<string>
  isWord: boolean
  basic?: { phonetic?: string; explains?: Array<string> }
  l: string
  web?: Array<translateWebResult>
  webdict?: { url: string }
  errorCode: string
}

function generateSign(content: string, salt: number, app_key: string, app_secret: string) {
  const md5 = crypto.createHash('md5')
  md5.update(app_key + content + salt + app_secret)
  const cipher = md5.digest('hex')
  return cipher.slice(0, 32).toUpperCase()
}

function handleContent(content: string, handle_annotation: boolean) {
  const annotations = ['///', '//!', '/*', '*/', '//']
  if (handle_annotation) {
    for (const annotation of annotations) {
      while (content.includes(annotation))
        content = content.replace(annotation, '')
    }
  }

  while (content.includes('\r'))
    content = content.replace('\r', '')

  const contentList = content.split('\n')
  for (const i in contentList) {
    contentList[i] = contentList[i].trim()
    if (contentList[i] === '')
      contentList[i] = '\n\n'
  }
  content = contentList.join(' ')
  return content
}

function translateAPI(content: string, from_language: string, to_language: string) {
  const { app_key, app_secret, handle_annotation } = getPreferenceValues()
  const q = Buffer.from(handleContent(content, handle_annotation)).toString()
  const salt = Date.now()
  const sign = generateSign(q, salt, app_key, app_secret)
  const url = new URL('https://openapi.youdao.com/api')
  const params = new URLSearchParams()
  params.append('q', q)
  params.append('appKey', app_key)
  params.append('from', from_language)
  params.append('to', to_language)
  params.append('salt', String(salt))
  params.append('sign', sign)
  url.search = params.toString()
  return fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
}

function TranslateResultActionPanel(props: { copyContent: string; url: string | undefined }) {
  const { copyContent, url } = props
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={copyContent} />
      {url ? <Action.OpenInBrowser url={url} /> : null}
    </ActionPanel>
  )
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false)
  const [toTranslate, setToTranslate] = useState('')
  const [translateResult, setTranslateResult] = useState<translateResult>({
    basic: {},
    isWord: false,
    l: '',
    translation: undefined,
    web: undefined,
    webdict: { url: '' },
    errorCode: '',
  })

  useEffect(() => {
    if (toTranslate === '')
      return

    setIsLoading(true);

    (async () => {
      const response = await translateAPI(toTranslate, 'auto', 'auto')
      setTranslateResult(await response.json() as translateResult)
      setIsLoading(false)
    })()
  }, [toTranslate])

  return (
    <List
      searchBarPlaceholder="Enter text to translate"
      onSearchTextChange={setToTranslate}
      isLoading={isLoading}
      throttle
    >
      {translateResult.translation
        ? translateResult.translation.map((item: string, index: number) => (
          <List.Item
            key={index}
            title={item}
            icon={{ source: Icon.Dot, tintColor: Color.Red }}
            actions={
              <TranslateResultActionPanel
                copyContent={item}
                url={(translateResult.webdict && translateResult.webdict.url) ? translateResult.webdict.url : undefined}
              />
            }
          />
        ))
        : null
      }
      {(translateResult.basic && translateResult.basic.explains && translateResult.basic.explains.length > 0)
        ? translateResult.basic.explains.map((item: string, index: number) => (
          <List.Item
            key={index}
            title={item}
            icon={{ source: Icon.Dot, tintColor: Color.Blue }}
            actions={
              <TranslateResultActionPanel
                copyContent={item}
                url={(translateResult.webdict && translateResult.webdict.url) ? translateResult.webdict.url : undefined}
              />
            }
          />
        ))
        : null
      }
      {(translateResult.web && translateResult.web.length > 0)
        ? translateResult.web.map((item: translateWebResult, index: number) => (
          <List.Item
            key={index}
            title={item.value.join(', ')}
            icon={{ source: Icon.Dot, tintColor: Color.Yellow }}
            subtitle={item.key}
            actions={
              <TranslateResultActionPanel
                copyContent={item.value.join(', ')}
                url={(translateResult.webdict && translateResult.webdict.url) ? translateResult.webdict.url : undefined}
              />
            }
          />
        ))
        : null
      }
    </List>
  )
}
