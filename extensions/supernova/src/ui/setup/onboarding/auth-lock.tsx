//
//  auth-lock.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Detail } from "@raycast/api"
import { useState, useEffect } from "react"
import { AuthLockProps } from "../../../definitions/props"
import { SupernovaAuthentication } from "../../../managers/supernova-authentication"
import { Onboarding } from "./onboarding"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const AuthLock = (props: AuthLockProps): JSX.Element => {
  // --- Hooks

  const authentication = SupernovaAuthentication.getInstance()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    checkIsAuthenticated()
  }, [])

  // --- Utils

  const checkIsAuthenticated = async () => {
    setIsAuthenticated(await authentication.getIsAuthenticated())
  }

  // --- Render

  // Note about render: For a split second, before the reducer takes effect, this can get to a state where it would blink. We are therefore not rendering anything before state is actually set to prevent this
  return (
    <>
      {isAuthenticated === false ? (
        <Onboarding child={props.authenticatedChild} onAuthSuccess={() => setIsAuthenticated(true)} />
      ) : isAuthenticated === true ? (
        props.authenticatedChild
      ) : (
        <Detail />
      )}
    </>
  )
}
