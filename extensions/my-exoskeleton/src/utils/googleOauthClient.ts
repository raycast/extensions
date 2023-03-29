import { OAuth2Client } from 'google-auth-library'
import { environment, getPreferenceValues, LocalStorage } from '@raycast/api'
import { BookmarkPreference } from '../apis/types/bookmark.type'
import http from 'http'
import url from 'url'
import fs from 'fs'
import open from 'open'
import destroyer from 'server-destroy'
import { isString } from './string'
import { isNil } from 'lodash'
import { ConfigCenterPreference } from './index'

const { oauthClientKey } = getPreferenceValues<ConfigCenterPreference>()

const refresh_token_path = environment.assetsPath + '/google-refresh-auth-token.json'
const normal_token_path = environment.assetsPath + '/google-normal-auth-token.json'
const scope = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const listen_port = 50000
const tokenKey = 'refreshToken'
const GoogleAuthenticated = () => {
  const client_keys = JSON.parse(oauthClientKey)
  return new Promise((resolve, reject) => {
    // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
    // which should be downloaded from the Google Developers Console.
    const oAuth2Client = new OAuth2Client(
      client_keys.web.client_id,
      client_keys.web.client_secret,
      client_keys.web.redirect_uris[0]
    )

    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scope,
      prompt: 'consent'
    })

    // Open an http server to accept the oauth callback. In this simple example, the
    // only request to our webserver is to /oauth2callback?code=<code>
    const server = http
      .createServer(async (req, res) => {
        try {
          // acquire the code from the querystring, and close the web server.
          const qs = new url.URL(req.url!, `http://localhost:${listen_port}`).searchParams
          const code = qs.get('code')
          console.log(`Code is ${code}`)
          res.end('Authentication successful! Please return to the console.')
          server.destroy()

          if (isNil(code)) {
            throw new Error(`Bad auth code [${code}]`)
          }
          // Now that we have the code, use that to acquire tokens.
          const r = await oAuth2Client.getToken(code)
          resolve(r.tokens)
        } catch (e) {
          reject(e)
        }
      })
      .listen(listen_port, () => {
        // open the browser to the authorize url to start the workflow
        open(authorizeUrl, { wait: false }).then((cp) => cp.unref())
      })
    destroyer(server)
  })
}

const getGoogleOAuthToken = async () => {
  const token = await LocalStorage.getItem(tokenKey)
  if (isString(token)) {
    return JSON.parse(token)
  }
  const newToken = await GoogleAuthenticated()
  await LocalStorage.setItem(tokenKey, JSON.stringify(newToken))
  return newToken
}

let client: OAuth2Client | null = null
const getOAuthClient = async () => {
  if (client === null) {
    try {
      const token = await getGoogleOAuthToken()
      const clientKeys = JSON.parse(oauthClientKey)
      client = new OAuth2Client(clientKeys.web.client_id, clientKeys.web.client_secret, clientKeys.web.redirect_uris[0])
      client.setCredentials(token)
    } catch (e) {
      console.error('ERROR', e)
      client = new OAuth2Client()
    }
  }
  return client
}

export { getOAuthClient, getGoogleOAuthToken }
