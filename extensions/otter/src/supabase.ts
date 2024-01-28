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
  }
)
