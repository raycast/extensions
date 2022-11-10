import { OAuth } from '@raycast/api'
import { oauthClient } from './client'
import { authorizeUrl, tokenUrl, clientId } from './constants'
import fetch from 'node-fetch'

export async function authorize(): Promise<string | null> {
  const tokenSet = await oauthClient.getTokens()

  if (tokenSet?.accessToken) {
    return tokenSet.accessToken
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: authorizeUrl,
    clientId: clientId,
    scope: '',
    extraParameters: {
      owner: 'user',
    },
  })

  const { authorizationCode } = await oauthClient.authorize(authRequest)
  const accessToken = await fetchToken(authRequest, authorizationCode)

  await oauthClient.setTokens({ accessToken, refreshToken: '' })

  return accessToken
}

async function fetchToken(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string
): Promise<string> {
  const params = new URLSearchParams()
  params.append('client_id', clientId)
  params.append('code', authCode)
  params.append('code_verifier', authRequest.codeVerifier)
  params.append('grant_type', 'authorization_code')
  params.append('redirect_uri', authRequest.redirectURI)

  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: params,
  })

  if (!response.ok) {
    throw new Error('Bad response from token endpoint')
  }

  const data: any = await response.json()

  return data.access_token
}
