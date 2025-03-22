//
//  select-design-system-form.tsx
//  Supernova.io Raycast Extension
//
//  Created by Jiri Trecak <Supernova.io>
//

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Imports

import { Action, ActionPanel, Form, Icon, List } from "@raycast/api"
import { DesignSystem, Supernova, Workspace } from "@supernovaio/supernova-sdk"
import { useState, useEffect } from "react"
import { useReducer } from "react"
import { spawnSync } from "child_process"
import { showErrorToast, showSuccessToast } from "../../utilities/toasts"
import { Clipboard } from "@raycast/api"
import { SupernovaAuthentication } from "../../managers/supernova-authentication"
import { SelectDesignSystemProps } from "../../definitions/props"
import { SupernovaSDK } from "../../managers/supernova-sdk"

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Definitions

export interface SelectFormState {
  fetchedWorkspaces: Array<Workspace>
  fetchedDesignSystems: Array<DesignSystem>
  apiKey: string
  workspaceId: string
  designSystemId: string
}

export interface ReducerAction {
  state: Partial<SelectFormState>
}

const reducer: React.Reducer<SelectFormState, ReducerAction> = (state, ReducerAction) => {
  return { ...state, ...ReducerAction.state }
}

const authentication = SupernovaAuthentication.getInstance()
const sdk = SupernovaSDK.getInstance()

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// MARK: - Main UI Component

export const SelectDesignSystem = (props: SelectDesignSystemProps) => {
  // --- Hooks & Props

  const [state, dispatch] = useReducer(reducer, {
    apiKey: "",
    workspaceId: "",
    designSystemId: "",
    fetchedWorkspaces: [],
    fetchedDesignSystems: []
  })

  const [apiKeyError, setApiKeyError] = useState<string | undefined>()
  const [designSystemError, setDesignSystemError] = useState<string | undefined>()
  const [workspaceError, setWorkspaceError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState<boolean | undefined>()

  useEffect(() => {
    loadInitialData()
  }, [])

  // --- Storage & Startup

  const loadInitialData = async () => {
    try {
      setIsLoading(true)
      if (await authentication.getIsAuthenticated()) {
        // Update API key immediately so user sees progress
        const apiKey = authentication.apiKey!
        dispatch({
          state: {
            apiKey: apiKey
          }
        })
        const wsId = authentication.workspaceId!
        const dsId = authentication.designSystemId!

        // Fetch design systems
        const supernova = new Supernova(apiKey, null, null)

        // Fetch workspaces
        const workspaces = await supernova.workspaces()
        if (workspaces.filter((w) => w.id === wsId).length === 1) {
          // Workspace still exists, use it
          const designSystems = await supernova.designSystems(wsId)
          if (designSystems.filter((d) => d.id === dsId).length === 1) {
            // Design system still exists, use it
            dispatch({
              state: {
                apiKey: apiKey,
                workspaceId: wsId,
                designSystemId: dsId,
                fetchedWorkspaces: workspaces,
                fetchedDesignSystems: designSystems
              }
            })
          } else {
            // Previously authenticated design system doesn't exist, skip pre-fill for now
            showErrorToast("Design system is no longer accessible. Please sign in again.")
            await authentication.logout()
          }
        } else {
          // Previously authenticated workspace doesn't exist, skip pre-fill for now
          showErrorToast("Workspace is no longer accessible. Please sign in again.")
          await authentication.logout()
        }
      } else {
        // User is not authenticated. Check clipboard for presence of key that user copied in the step before
        const text = await Clipboard.readText()
        if (text && !text.includes("\n") && text.length > 90 && text.length < 110) {
          // Very particular set of circumstances were met so it is highly likely it is the key that user copied beforehand - let's use it
          onApiKeyChanged(text)
        }
      }
      setIsLoading(false)
    } catch (err: any) {
      showErrorToast(err.message)
      setIsLoading(false)
    }
  }

  const saveAndClose = async () => {
    // Validate that all input properties are in and prevent save if failure occurs
    let validationResult = true
    validationResult = validateReportAPIKey() && validationResult
    validationResult = validateReportDesignSystem() && validationResult
    validationResult = validateReportWorkspace() && validationResult
    if (!validationResult) {
      return
    }

    // Save authentication and purge cache
    authentication.authenticate(state.apiKey, state.workspaceId, state.designSystemId)
    sdk.cache.purgeCache()

    // Celebrate!
    spawnSync(`open raycast://confetti`, { shell: true })

    // Go to the commands
    showSuccessToast("You are all set!", "Start by searching your data!")

    // Handle different entry points differently
    props.onAuthSuccess()
  }

  // --- Observers

  const onApiKeyChanged = async (newApiKey: string) => {
    dropAPIKeyErrorIfNeeded()
    dispatch({
      state: {
        apiKey: newApiKey,
        designSystemId: undefined,
        workspaceId: undefined,
        fetchedWorkspaces: [],
        fetchedDesignSystems: []
      }
    })

    if (newApiKey.length > 90 && newApiKey.length < 110) {
      // Update workspaces only if API key was provided by copy paste (or fixed). This is realistic, API key length is 99 characters
      // which in no way will anyone write by hand (but don't want to limit it precisely to that number should the API keygen change)
      await updateWorkspaces(newApiKey)
    } else if (newApiKey.length > 0) {
      setApiKeyError("Provided API key was invalid, try again")
    }
  }

  const onWorkspaceSelected = async (wsId: string) => {
    dropWSErrorIfNeeded()
    dispatch({
      state: {
        workspaceId: wsId,
        fetchedDesignSystems: [],
        designSystemId: undefined
      }
    })
    await updateDesignSystems(state.apiKey, wsId)
  }

  const onDesignSystemSelected = (dsId: string) => {
    dropDSErrorIfNeeded()
    dispatch({
      state: {
        designSystemId: dsId
      }
    })
  }

  // --- Updates

  async function updateWorkspaces(apiKey: string) {
    if (!apiKey) {
      // Ignore
      return
    }
    try {
      setIsLoading(true)
      const supernovaSDK = new Supernova(apiKey, null, null)
      const workspaces = await supernovaSDK.workspaces()
      if (workspaces.length > 0) {
        // Re-fetch WS values because API key is set
        const selectedWorkspace = workspaces[0]
        dispatch({
          state: {
            fetchedWorkspaces: workspaces,
            workspaceId: selectedWorkspace.id
          }
        })
        await updateDesignSystems(apiKey, selectedWorkspace.id)
      } else {
        setApiKeyError("No workspaces detected for this API key. Provide new API key or create initial workspace")
      }
    } catch (error) {
      console.log(error)
      setApiKeyError("Provided API key was invalid, try again")
    }
    setIsLoading(false)
  }

  async function updateDesignSystems(apiKey: string, workspaceId: string) {
    if (!apiKey) {
      // Ignore
      return
    }
    setIsLoading(true)
    try {
      if (workspaceId) {
        const supernovaSDK = new Supernova(apiKey, null, null)
        // Re-fetch DS values because workspace is set
        const designSystems = await supernovaSDK.designSystems(workspaceId)
        const selectedDesignSystem = designSystems[0]
        if (designSystems.length > 0) {
          dispatch({
            state: {
              fetchedDesignSystems: designSystems,
              designSystemId: selectedDesignSystem.id
            }
          })
        } else {
          // No design systems
          dispatch({
            state: {
              fetchedDesignSystems: [],
              designSystemId: undefined
            }
          })
        }
      } else {
        // Reset to empty
        dispatch({
          state: {
            fetchedDesignSystems: [],
            designSystemId: undefined
          }
        })
      }
    } catch (error) {
      setDesignSystemError("Unable to obtain design systems, try to provide valid API key or make sure you are connected to internet")
    }
    setIsLoading(false)
  }

  // --- Validation

  function dropAPIKeyErrorIfNeeded() {
    if (apiKeyError && apiKeyError.length > 0) {
      setApiKeyError(undefined)
    }
  }

  function dropWSErrorIfNeeded() {
    if (workspaceError && workspaceError.length > 0) {
      setWorkspaceError(undefined)
    }
  }

  function dropDSErrorIfNeeded() {
    if (designSystemError && designSystemError.length > 0) {
      setDesignSystemError(undefined)
    }
  }

  function validateReportAPIKey(): boolean {
    const valid = state.apiKey.length > 0
    if (!valid) {
      setApiKeyError("API key must be provided")
    }
    return valid
  }

  function validateReportWorkspace(): boolean {
    const valid = state.workspaceId !== undefined
    if (!valid) {
      setWorkspaceError("Workspace must be selected")
    }
    return valid
  }

  function validateReportDesignSystem(): boolean {
    const valid = state.designSystemId !== undefined
    if (!valid) {
      setDesignSystemError("Design system must be selected")
    }
    return valid
  }

  // --- Render

  return (
    <>
      <List>
        <List.Item title="URL" icon={{ source: "https://raycast.com/uploads/avatar.png" }} />
      </List>
      <Form
        isLoading={isLoading}
        navigationTitle="Select design system to use "
        actions={
          <ActionPanel>
            <Action title="Use Selected Design System" onAction={saveAndClose} icon={Icon.Check} />
            <Action.OpenInBrowser title="Open Cloud App" url={`https://cloud.supernova.io`} />
            <Action.OpenInBrowser title="Learn About Supernova" url={`https://learn.supernova.io`} />
          </ActionPanel>
        }
      >
        <Form.Description text="Select the design system to pull the data from 👉" />
        <Form.PasswordField
          id="apiKey"
          title="Supernova API Key"
          error={apiKeyError}
          value={state.apiKey}
          onChange={onApiKeyChanged}
          info="Obtain your API key by visiting your Supernova Cloud > Profile Settings > Authentication"
        />
        <Form.Separator />
        <Form.Dropdown id="selectedWorkspace" title="Workspace" error={workspaceError} onChange={onWorkspaceSelected} value={state.workspaceId}>
          {state.fetchedWorkspaces.map((v, i) => (
            <Form.Dropdown.Item key={i} title={v.name} value={v.id} />
          ))}
        </Form.Dropdown>
        <Form.Dropdown id="selectedDesignSystem" title="Design System" error={designSystemError} onChange={onDesignSystemSelected} value={state.designSystemId}>
          {state.fetchedDesignSystems.map((v, i) => (
            <Form.Dropdown.Item key={i} title={v.name} value={v.id} />
          ))}
        </Form.Dropdown>
      </Form>
    </>
  )
}
