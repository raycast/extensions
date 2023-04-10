//
//  supernova-authentication.ts
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { LocalStorage } from "@raycast/api"
import { PreferenceKeys } from "../definitions/constants"
import { SupernovaSDK } from "./supernova-sdk"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Authenticator Instance

/** High level authentication handler */
export class SupernovaAuthentication {
  // --- Singleton

  private static instance: SupernovaAuthentication
  private constructor() {
    SupernovaAuthentication.instance = this
  }

  static getInstance() {
    if (!SupernovaAuthentication.instance) {
      this.instance = new SupernovaAuthentication()
    }

    return this.instance
  }

  // --- Properties

  apiKey: string | undefined = undefined
  workspaceId: string | undefined = undefined
  designSystemId: string | undefined = undefined

  // --- Auth methods

  /** Auto-authenticate anywhere we need to enforce authentication and where authentication is expected. If authentication fails, notify user, as we are just refreshing existing token.
   * This function should never be called in points where we are not confident user would not have authentication already done
   */
  async autoauthenticate(sdk: SupernovaSDK): Promise<void> {
    await this.loadPreferences()
    const apiKey = this.apiKey
    const dsKey = this.designSystemId
    if (apiKey && dsKey) {
      sdk.authenticate(apiKey, dsKey)
    } else {
      throw new Error("Search view can't be accessed without authentication")
    }
  }

  /** Authenticate user */
  async authenticate(newAPIKey: string, newWSId: string, newDSId: string): Promise<void> {
    this.apiKey = newAPIKey
    this.workspaceId = newWSId
    this.designSystemId = newDSId
    await this.savePreferences()
  }

  /** Remove user authentication */
  async logout(): Promise<void> {
    this.apiKey = undefined
    this.workspaceId = undefined
    this.designSystemId = undefined
    await this.savePreferences()
  }

  async savePreferences() {
    // Clear previous values (might be undefined)
    await LocalStorage.removeItem(PreferenceKeys.PREF_NAME_API_KEY)
    await LocalStorage.removeItem(PreferenceKeys.PREF_NAME_DS_ID)
    await LocalStorage.removeItem(PreferenceKeys.PREF_NAME_WS_ID)
    // Set new values. Only store in bulk, partial information makes no sense
    if (this.apiKey && this.workspaceId && this.designSystemId) {
      await LocalStorage.setItem(PreferenceKeys.PREF_NAME_API_KEY, this.apiKey)
      await LocalStorage.setItem(PreferenceKeys.PREF_NAME_WS_ID, this.workspaceId)
      await LocalStorage.setItem(PreferenceKeys.PREF_NAME_DS_ID, this.designSystemId)
    }
  }

  async loadPreferences() {
    // Load data. Only load in bulk, partial information makes no sense
    const possibleAPIKey = await LocalStorage.getItem<string>(PreferenceKeys.PREF_NAME_API_KEY)
    const possibleWSId = await LocalStorage.getItem<string>(PreferenceKeys.PREF_NAME_WS_ID)
    const possibleDSId = await LocalStorage.getItem<string>(PreferenceKeys.PREF_NAME_DS_ID)
    if (possibleAPIKey && possibleWSId && possibleDSId) {
      this.apiKey = possibleAPIKey
      this.workspaceId = possibleWSId
      this.designSystemId = possibleDSId
    }
  }

  /** Check whether user is authenticated */
  async getIsAuthenticated(): Promise<boolean> {
    await this.loadPreferences()
    return (
      this.apiKey !== undefined &&
      this.workspaceId !== undefined &&
      this.designSystemId !== undefined &&
      this.apiKey.length > 0 &&
      this.workspaceId.length > 0 &&
      this.designSystemId.length > 0
    )
  }
}
