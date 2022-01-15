import { getPreferenceValues, showToast, ToastStyle } from '@raycast/api'
import fetch from 'node-fetch'
import { TrelloFetchResponse } from '../trelloResponse.model'
const TRELLO_APP_KEY = "13f8c59607ba6d82531d3db5f46999c1";

export interface Preferences {
  token: string;
}

const { token }: Preferences = getPreferenceValues();

export const fetchTodos = async (
): Promise<TrelloFetchResponse> => {
  try {
    const response = await fetch(
      `https://api.trello.com/1/members/chrischinchilla/cards?filter=visible&key=${TRELLO_APP_KEY}&token=${token}`,
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
      `https://api.trello.com/1/search?filter=visible&key=${TRELLO_APP_KEY}&token=${token}&modelTypes=cards&query=${searchTerm}`,
    )
    const json = await response.json()
    return json.cards as TrelloFetchResponse
  } catch (error) {
    showToast(ToastStyle.Failure, 'Could not fetch ToDos')
    return Promise.resolve([])
  }
}