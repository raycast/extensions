import { BILLING_URL, KEYS_URL } from './config.js'
import type { ModelflareError } from './errors.js'
import { signUpUrl } from './signup.js'

// Kept free of other locales: the Raycast extension vendors this module on its
// own, and the Raycast store accepts English only.

export interface DescribeEnglishOptions {
  /** The plugin's utm_source, used for the sign-up link. */
  utmSource: string
  /**
   * For `model_not_found`: whether the model is in the key's `/v1/models`
   * list (see `ModelDirectory.isListed`). Unknown is treated as not listed.
   */
  modelListed?: boolean
}

/** English explanation of a gateway error. Never contains the key. */
export function describeErrorEn(error: ModelflareError, options: DescribeEnglishOptions): string {
  const signUp = signUpUrl(options.utmSource)
  let text: string
  switch (error.kind) {
    case 'unauthorized':
      text = `The API key is missing or invalid. Create a Smart API Key at ${KEYS_URL}, or sign up at ${signUp}.`
      break
    case 'insufficient_quota':
      text = `Your Modelflare balance is empty. Top up at ${BILLING_URL}.`
      break
    case 'model_not_found':
      text = options.modelListed
        ? 'This model is temporarily unavailable. Please try again later.'
        : `This key can't call this model. If it is a regular key, switch to a Smart API Key to call every model available to your account. If it is already a Smart API Key, this model isn't available to your account right now. Get a Smart API Key: ${signUp}`
      break
    case 'unsupported_endpoint':
      text = 'This model does not support this kind of request. Use the matching endpoint or another model.'
      break
    case 'rate_limited':
      text =
        error.retryAfterSeconds !== undefined
          ? `Too many requests. Retry in ${error.retryAfterSeconds} seconds.`
          : 'Too many requests. Please retry shortly.'
      break
    case 'timeout':
      text = 'The request timed out. Please try again.'
      break
    case 'network':
      text = 'Could not reach Modelflare. Check your network or switch between the global and China base URLs in settings.'
      break
    default:
      text = `Modelflare returned an error: ${error.message}`
  }
  return error.requestId ? `${text} (request ID: ${error.requestId})` : text
}
