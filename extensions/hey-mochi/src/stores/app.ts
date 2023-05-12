import { create } from 'zustand'
import { PromptType } from '../models'

type AppState = {
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void

  isShowingDetail: boolean
  setIsShowingDetail: (isShowingDetail: boolean) => void

  promptType: PromptType | null
  setPromptType: (promptType: PromptType) => void
}

export const useAppStore = create<AppState>()((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  isShowingDetail: false,
  setIsShowingDetail: (isShowingDetail) => set({ isShowingDetail }),

  promptType: null,
  setPromptType: (promptType: PromptType) => set({ promptType }),
}))
