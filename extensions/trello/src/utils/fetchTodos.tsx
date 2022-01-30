import { getPreferenceValues, showToast, ToastStyle } from '@raycast/api'
import fetch from 'node-fetch'
// import { promises } from 'stream';
import { TrelloFetchResponse } from '../trelloResponse.model'

export interface Preferences {
  token: string;
  apitoken: string;
  username: string;
}

const { token }: Preferences = getPreferenceValues();
const { apitoken }: Preferences = getPreferenceValues();
const { username }: Preferences = getPreferenceValues();

export const returnTodos = async (
  searchTerm: string,
): Promise<TrelloFetchResponse> => {
  try {
    if (searchTerm != '') {
      const response = await fetch(
        `https://api.trello.com/1/search?filter=visible&key=${apitoken}&token=${token}&modelTypes=cards&query=${searchTerm}`,
      )
      const json = await response.json()
      return json as TrelloFetchResponse
    } else {
      console.log("h")
      try {
        const response = await fetch(
          `https://api.trello.com/1/members/${username}/cards?filter=visible&key=${apitoken}&token=${token}`,
        )
        const json = await response.json()
        return json as TrelloFetchResponse
      } catch (error) {
        showToast(ToastStyle.Failure, 'Could not fetch ToDos')
        return Promise.resolve([])
      }

    }
  } catch (error) {
    showToast(ToastStyle.Failure, 'Could not fetch ToDos')
    return Promise.resolve([])
  }
}