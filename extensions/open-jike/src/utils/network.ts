import { execa } from 'execa'

interface ProxyServer {
  addr: string
  port: number
}

interface SystemProxy {
  http?: ProxyServer
  https?: ProxyServer
}

export async function getSystemProxy(): Promise<SystemProxy | undefined> {
  try {
    const result = await execa('/usr/sbin/scutil', ['--proxy'])
    if (result.exitCode !== 0) return
    const map = parseSettings(result.stdout)
    if (!map) return

    const proxy: SystemProxy = {}
    if (map.HTTPEnable) {
      proxy.http = {
        addr: map.HTTPProxy,
        port: +map.HTTPPort,
      }
    }
    if (map.HTTPSEnable) {
      proxy.https = {
        addr: map.HTTPSProxy,
        port: +map.HTTPSPort,
      }
    }

    return proxy
  } catch {}

  // fork: https://github.com/jmshal/node-macos-system-proxy-settings/blob/master/parse-settings.js
  // This technique of parsing is fairly naive, but it works pretty well, so eh.
  function parseSettings(str: string | Buffer) {
    const matchLine = /^\s*((\w+) : )?(<\w+>)?\s?(.*)$/
    const matchNumeric = /^\d+(\.\d*)?$/

    const lines = String(str).split('\n')
    const stack: any[] = []
    let root: any

    lines.forEach((line) => {
      let key: string | number, value: string | number

      const values = line.match(matchLine)
      if (!values) {
        return
      }

      const parent = stack[stack.length - 1] || {}

      key = values[2]
      const type = values[3]
      value = values[4]

      if (Array.isArray(parent)) {
        key = Number.parseInt(key, 10)
      }

      if (value === '}') {
        if (stack.length === 1) {
          root = stack[0]
        }
        stack.pop()
      } else if (type === '<array>') {
        stack.push((parent[key] = []))
      } else if (type === '<dictionary>') {
        stack.push((parent[key] = {}))
      } else {
        if (value.match(matchNumeric)) {
          value = Number.parseFloat(value)
        }
        parent[key] = value
      }
    })

    return root
  }
}
