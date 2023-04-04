import { getPreferenceValues, LocalStorage } from '@raycast/api'

import { create } from 'zustand'

import { Preferences, State } from '@/types'

export const useStore = create<State>(set => ({
  loading: false,
  currentPrompt: '',
  chatMessages: [],
  selectedItemId: '',
  totalTokens: 0,
  systemMessage: '',
}))

const preferences = getPreferenceValues<Preferences>()

export async function updateState(keyValue: { [T in keyof State]?: State[T] }) {
  useStore.setState({ ...useStore.getState(), ...keyValue })

  if (preferences.saveMessages) {
    await LocalStorage.setItem('state', JSON.stringify(useStore.getState()))
  }
}

export async function loadState() {
  if (!preferences.saveMessages) {
    return
  }

  const item = await LocalStorage.getItem<string>('state')

  if (item) {
    useStore.setState({ ...(JSON.parse(item) as State), loading: false })
  }
}
