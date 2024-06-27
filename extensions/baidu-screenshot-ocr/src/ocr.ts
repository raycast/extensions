import fs from 'fs'
import axios from 'axios'
import { getPreferenceValues, showHUD } from '@raycast/api'

interface Preferences {
  BaiduOCRAppKey: string;
  BaiduOCRSecretKey: string;
}

const transImage2Base64 = (path: string): string | null => {
  try {
    return fs.readFileSync(decodeURI(path), { encoding: 'base64' })
  }
  catch (err) {
    showHUD(`❌ File Not Found! ${err}`)

    return null
  }
}

const getAccessToken = async(): Promise<string> => {
  const preferences = getPreferenceValues<Preferences>()
  const { BaiduOCRAppKey: AK, BaiduOCRSecretKey: SK } = preferences

  try {
    const response = await axios.post('https://aip.baidubce.com/oauth/2.0/token', null, {
      params: {
        grant_type: 'client_credentials',
        client_id: AK,
        client_secret: SK,
      },
    })

    if (response.data && response.data.access_token) {
      return response.data.access_token
    }
    else {
      throw new Error('No access token found in response')
    }
  }
  catch (err) {
    console.error('Error fetching access token:', err.message)
    throw new Error(`Failed to get access token: ${err.message}`)
  }
}

export { getAccessToken }

async function recognizeText(filepath: string): Promise<string> {
  try {
    const token = await getAccessToken()
    const imageBase64 = transImage2Base64(filepath)

    if (!imageBase64) {
      throw new Error('File Not Found')
    }

    const response = await axios.post(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`,
      new URLSearchParams({
        image: imageBase64,
        detect_direction: 'false',
        detect_language: 'false',
        paragraph: 'false',
        probability: 'false',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      },
    )

    if (response.data && response.data.words_result) {
      return response.data.words_result.map((item: { words: string }) => item.words).join('\n')
    }
    else {
      return ''
    }
  }
  catch (error) {
    console.error('Error recognizing text:', error.message)
    throw new Error('Failed to recognize text')
  }
}

export { recognizeText }
