import { useCachedState } from '@raycast/utils'
import React from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useCachedState<User | null>('user', null)

  React.useEffect(() => {
    supabase.auth.getUser().then((res) => {
      if (res.data.user) {
        setUser(res.data.user)
      }
    })
  }, [])

  return user
}
