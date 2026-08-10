declare module 'supergenpass-lib' {
  export type GenerationOptions = {
    /**
     * @default 10
     */
    hashRounds?: number
    /**
     * @default 10
     */
    length?: number
    /**
     * @default 'md5'
     */
    method?: 'md5' | 'sha512' | ((payload: string) => string)
    /**
     * @default false
     */
    passthrough?: boolean
    /**
     * @default true
     */
    removeSubdomains?: boolean
    /**
     * @default ''
     */
    secret?: string
  }

  export type GeneratedPasswordCallback = (password: string) => any

  export function generate(
    masterPassword: string,
    uri: string,
    options: GenerationOptions,
    callback: GeneratedPasswordCallback
  )

  export type HostnameOptions = {
    /**
     * @default true
     */
    removeSubdomains: boolean
  }

  export function hostname(uri: string, options: HostnameOptions)
}
