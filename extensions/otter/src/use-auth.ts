import * as React from 'react'
import { Toast, getPreferenceValues, showToast } from '@raycast/api'
import { supabase } from './supabase'

export function useAuth() {
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function init() {
      if ((await supabase.auth.getUser()).data.user) {
        return
      }

      const preferences = getPreferenceValues<Preferences>()

      const { error } = await supabase.auth.signInWithPassword({
        email: preferences.loginEmail,
        password: preferences.loginPassword,
      })

      if (error) {
        setError(error.message)
        await showToast({
          title: 'Error',
          message: error.message,
          style: Toast.Style.Failure,
        })
        return
      }
    }

    init()
  })

  return error
}

interface Preferences {
  loginEmail: string
  loginPassword: string
}
