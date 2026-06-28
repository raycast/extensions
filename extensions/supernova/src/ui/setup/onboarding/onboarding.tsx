//
//  onboarding.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Detail, environment, Icon } from "@raycast/api"
import { Action, ActionPanel } from "@raycast/api"
import { useState } from "react"
import { OnboardingProps } from "../../../definitions/props"
import { SelectDesignSystem } from "../select-design-system"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const Onboarding = (props: OnboardingProps): JSX.Element => {
  // --- Stage management
  environment.assetsPath

  const [onboardingStage, setOnboardingStage] = useState<number | undefined>(1)
  const welcomeMarkdown = `![Welcome to Supernova](file://${environment.assetsPath}/onboarding-1.png)`
  const getKeyMarkdown = `![Let's get you a key](file://${environment.assetsPath}/onboarding-2.png)\n\n---\n\nFirst, you'll need API key to access your design system data. If you've already signed in to Supernova, [continue here](https://cloud.supernova.io/user-profile/authentication), otherwise [sign in](https://cloud.supernova.io/) and navigate to \`Profile > Authentication > New Token\`. Copy the token from the Cloud and hit next!`

  const proceedToKeyStage = () => {
    setOnboardingStage(2)
  }
  const proceedToAuthForm = () => {
    setOnboardingStage(3)
  }
  const onAuthSuccess = () => {
    setOnboardingStage(4)
  }

  // --- Render

  return onboardingStage === 1 ? (
    <Detail
      markdown={welcomeMarkdown}
      navigationTitle="Welcome to Supernova!"
      actions={
        <ActionPanel>
          <Action title="Let's Get Started 👉" onAction={proceedToKeyStage} icon={Icon.Check} />
          <Action.OpenInBrowser title="Open Cloud App" url={`https://cloud.supernova.io`} />
          <Action.OpenInBrowser title="Learn About Supernova" url={`https://learn.supernova.io`} />
        </ActionPanel>
      }
    />
  ) : onboardingStage === 2 ? (
    <Detail
      markdown={getKeyMarkdown}
      navigationTitle="Let's Get Started!"
      actions={
        <ActionPanel>
          <Action title="I Got My Key 🎉" onAction={proceedToAuthForm} icon={Icon.Check} />
          <Action.OpenInBrowser title="Open Cloud App" url={`https://cloud.supernova.io`} />
          <Action.OpenInBrowser title="Learn About Supernova" url={`https://learn.supernova.io`} />
        </ActionPanel>
      }
    />
  ) : onboardingStage === 3 ? (
    <SelectDesignSystem onAuthSuccess={onAuthSuccess} />
  ) : (
    props.child
  )
}
