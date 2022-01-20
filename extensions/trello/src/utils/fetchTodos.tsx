import { getPreferenceValues, showToast, ToastStyle } from '@raycast/api'
import fetch from 'node-fetch'
import { TrelloFetchResponse } from '../trelloResponse.model'

export interface Preferences {
  token: string;
  apitoken: string;
}

const { token }: Preferences = getPreferenceValues();
const { apitoken }: Preferences = getPreferenceValues();

export const fetchTodos = async (
): Promise<TrelloFetchResponse> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/members/chrischinchilla/cards?filter=visible&key=${apitoken}&token=${token}`,
    )
    const json = await response.json()
    return json as TrelloFetchResponse
  } catch (error) {
    showToast(ToastStyle.Failure, 'Could not fetch ToDos')
    return Promise.resolve([])
  }
}

export const searchTodos = async (
  searchTerm = '',
): Promise<TrelloFetchResponse> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/search?filter=visible&key=${apitoken}&token=${token}&modelTypes=cards&query=${searchTerm}`,
    )
    const json = await response.json()
    return json.cards as TrelloFetchResponse
  } catch (error) {
    showToast(ToastStyle.Failure, 'Could not fetch ToDos')
    return Promise.resolve([])
  }
}