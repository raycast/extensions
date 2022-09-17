import { oauthClient } from '@/services/notion/oauth/client'
import {
  FC,
  useMemo,
  createContext,
  useReducer,
  useCallback,
  useEffect,
} from 'react'

type Context = State & {
  actions: Actions
}

type State = {
  token: string | null
}

type Actions = {
  setToken: (token: string) => void
}

type Action = {
  type: 'SET_TOKEN'
  payload: string | null
}

const initialState = {
  token: null,
}

export const UNAUTHORIZED_TOKEN = 'UNAUTHORIZED_TOKEN'

export const TokenContext = createContext<Context>(initialState as Context)

export const TokenProvider: FC = ({ children }) => {
  const [state, dispatch] = useReducer(tokenReducer, initialState)

  const setToken = useCallback(
    (token: string) => dispatch({ type: 'SET_TOKEN', payload: token }),
    [dispatch]
  )

  const getToken = async () => {
    const accessToken = (await oauthClient.getTokens())?.accessToken
    if (accessToken) {
      setToken(accessToken)
    } else {
      setToken(UNAUTHORIZED_TOKEN)
    }
  }

  useEffect(() => {
    getToken()
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      actions: { setToken },
    }),
    [state]
  )
  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
}

function tokenReducer(state: State, action: Action) {
  switch (action.type) {
    case 'SET_TOKEN': {
      return {
        token: action.payload,
      }
    }
    default:
      return state
  }
}
