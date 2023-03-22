import { RepoType } from './type'

export type CommandState = {
  selectedLanguage: string
  isLoading: boolean
  repos: RepoType[]
  query: string
  range: string
}

export type CommandAction =
  | { type: 'SET_SELECTED_LANGUAGE'; payload: string }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_REPOS'; payload: RepoType[] }
  | { type: 'SET_QUERY'; payload: string }
  | { type: 'SET_RANGE'; payload: string }

export const commandReducer = (state: CommandState, action: CommandAction) => {
  switch (action.type) {
    case 'SET_SELECTED_LANGUAGE':
      return { ...state, selectedLanguage: action.payload }
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_REPOS':
      return { ...state, repos: action.payload }
    case 'SET_QUERY':
      return { ...state, query: action.payload }
    case 'SET_RANGE':
      return { ...state, range: action.payload }
    default:
      return state
  }
}
