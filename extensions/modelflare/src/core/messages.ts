import { BILLING_URL, KEYS_URL } from './config.js'
import type { ModelflareError } from './errors.js'
import { signUpUrl } from './signup.js'

export type Locale = 'en' | 'zh'

export interface DescribeOptions {
  locale: Locale
  /** The plugin's utm_source, used for the sign-up link. */
  utmSource: string
  /**
   * For `model_not_found`: whether the model is in the key's `/v1/models`
   * list (see `ModelDirectory.isListed`). Unknown is treated as not listed.
   */
  modelListed?: boolean
}

/** Copy shared by every plugin's settings screen. */
export const SMART_KEY_HINT: Record<Locale, string> = {
  en: 'Recommended: one Smart API Key calls every model available to your account, and new models work without editing the key. Create one under API Keys → Create Smart API Key.',
  zh: '推荐使用 Smart API Key：一个 Key 调用你账号可用的全部模型，新模型上线无需改 Key。在控制台 API Keys →“Create Smart API Key”创建。',
}

export const ROUTING_STRATEGY_HINT: Record<Locale, string> = {
  en: 'Routing strategy (Balanced / Stability first / Low price first) is a property of the key and is changed in the console.',
  zh: '路由策略（均衡 / 稳定优先 / 低价优先）是 Key 的属性，在控制台的 Key 设置中修改。',
}

function withRequestId(text: string, error: ModelflareError, locale: Locale): string {
  if (!error.requestId) return text
  return locale === 'zh' ? `${text}（请求 ID：${error.requestId}）` : `${text} (request ID: ${error.requestId})`
}

/** User-facing explanation of a gateway error. Never contains the key. */
export function describeError(error: ModelflareError, options: DescribeOptions): string {
  const { locale } = options
  const zh = locale === 'zh'
  const signUp = signUpUrl(options.utmSource)
  let text: string
  switch (error.kind) {
    case 'unauthorized':
      text = zh
        ? `API Key 缺失或无效。请在 ${KEYS_URL} 创建 Smart API Key；还没有账号可在 ${signUp} 注册。`
        : `The API key is missing or invalid. Create a Smart API Key at ${KEYS_URL}, or sign up at ${signUp}.`
      break
    case 'insufficient_quota':
      text = zh
        ? `Modelflare 余额不足，请在 ${BILLING_URL} 充值。`
        : `Your Modelflare balance is empty. Top up at ${BILLING_URL}.`
      break
    case 'model_not_found':
      text = options.modelListed
        ? zh
          ? '该模型暂时不可用，请稍后重试。'
          : 'This model is temporarily unavailable. Please try again later.'
        : zh
          ? `当前 Key 不能调用此模型。如果你用的是普通 Key，换用 Smart API Key 即可调用你账号可用的全部模型；如果已经是 Smart API Key，说明此模型在你的账号下暂不可用。获取 Smart API Key：${signUp}`
          : `This key can't call this model. If it is a regular key, switch to a Smart API Key to call every model available to your account. If it is already a Smart API Key, this model isn't available to your account right now. Get a Smart API Key: ${signUp}`
      break
    case 'unsupported_endpoint':
      text = zh
        ? '该模型不支持这种请求类型，请换用对应的接口或模型。'
        : 'This model does not support this kind of request. Use the matching endpoint or another model.'
      break
    case 'rate_limited':
      text = error.retryAfterSeconds !== undefined
        ? zh
          ? `请求过于频繁，请在 ${error.retryAfterSeconds} 秒后重试。`
          : `Too many requests. Retry in ${error.retryAfterSeconds} seconds.`
        : zh
          ? '请求过于频繁，请稍后重试。'
          : 'Too many requests. Please retry shortly.'
      break
    case 'timeout':
      text = zh ? '请求超时，请稍后重试。' : 'The request timed out. Please try again.'
      break
    case 'network':
      text = zh
        ? '无法连接 Modelflare。请检查网络，或在设置中切换全球 / 国内 Base URL。'
        : 'Could not reach Modelflare. Check your network or switch between the global and China base URLs in settings.'
      break
    default:
      text = zh ? `Modelflare 返回错误：${error.message}` : `Modelflare returned an error: ${error.message}`
  }
  return withRequestId(text, error, locale)
}
