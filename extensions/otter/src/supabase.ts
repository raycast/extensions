import { LocalStorage, getPreferenceValues } from '@raycast/api'
import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase-types'

const prefs = getPreferenceValues()

class Storage {
  async getItem(key: string) {
    return await LocalStorage.getItem<string>(key)
  }

  async removeItem(key: string) {
    await LocalStorage.removeItem(key)
  }

  async setItem(key: string, value: string) {
    await LocalStorage.setItem(key, value)
  }
}

export async function authorize() {
  const rawSession = await LocalStorage.getItem('session')
  const session = rawSession ? JSON.parse(String(rawSession)) : null
  const { loginEmail: email, loginPassword: password } = prefs

  if (session && email === session.user?.email) {
    const { data, error } = await supabase.auth.setSession(session)
    LocalStorage.setItem('session', JSON.stringify(data.session))
    return { user: data.user, error }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    LocalStorage.setItem('session', JSON.stringify(data.session))
    return { user: data.user, error }
  }
}

export const supabase = createClient<Database>(
  prefs.supabaseUrl,
  prefs.supabaseAnonKey,
  {
    auth: {
      // @ts-expect-error -- No idea
      storage: new Storage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
