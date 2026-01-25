import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import { useEffect, useState } from "react"
import React from "react"
import {
  getEnvironments,
  saveEnvironment,
  deleteEnvironment,
  getActiveEnvironmentId,
  setActiveEnvironment,
  Environment,
} from "../utils/environmentStorage"

type EnvironmentManagerProps = {
  onEnvironmentChange?: () => void
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({
  onEnvironmentChange,
}) => {
  const { push, pop } = useNavigation()
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadEnvironments = async () => {
    setIsLoading(true)
    try {
      const envs = await getEnvironments()
      const active = await getActiveEnvironmentId()
      setEnvironments(envs)
      setActiveId(active)
    } catch (error) {
      showToast({
        title: "Failed to load environments",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEnvironments()
  }, [])

  const handleSetActive = async (id: string) => {
    try {
      await setActiveEnvironment(id)
      setActiveId(id)
      showToast({
        title: "Environment activated",
        style: Toast.Style.Success,
      })
      if (onEnvironmentChange) {
        onEnvironmentChange()
      }
      pop()
    } catch (error) {
      showToast({
        title: "Failed to activate environment",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEnvironment(id)
      await loadEnvironments()
      showToast({
        title: "Environment deleted",
        style: Toast.Style.Success,
      })
    } catch (error) {
      showToast({
        title: "Failed to delete",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search environments"
      actions={
        <ActionPanel>
          <Action
            title="Create New Environment"
            icon={Icon.Plus}
            onAction={() =>
              push(
                <EnvironmentForm
                  onSave={() => {
                    loadEnvironments()
                    showToast({
                      title: "Environment created",
                      style: Toast.Style.Success,
                    })
                  }}
                />
              )
            }
          />
        </ActionPanel>
      }
    >
      {environments.length === 0 ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Environments"
          description="Create an environment to manage variables"
        />
      ) : (
        environments.map((env) => (
          <List.Item
            key={env.id}
            title={env.name}
            subtitle={`${Object.keys(env.variables).length} variable(s)`}
            icon={
              activeId === env.id
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Circle
            }
            accessories={[
              activeId === env.id
                ? { text: "Active", icon: Icon.Checkmark }
                : {},
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Name"
                      text={env.name}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Variables"
                      text={Object.keys(env.variables).length.toString()}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    {Object.entries(env.variables).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <List.Item.Detail.Metadata.Label
                          title={key}
                          text={value}
                        />
                      </React.Fragment>
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {activeId !== env.id && (
                  <Action
                    title="Set as Active"
                    icon={Icon.CheckCircle}
                    onAction={() => handleSetActive(env.id)}
                  />
                )}
                <Action
                  title="Edit Environment"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <EnvironmentForm
                        environment={env}
                        onSave={() => {
                          loadEnvironments()
                          showToast({
                            title: "Environment updated",
                            style: Toast.Style.Success,
                          })
                        }}
                      />
                    )
                  }
                />
                {env.id !== "default" && (
                  <Action
                    title="Delete Environment"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "delete" }}
                    onAction={() => handleDelete(env.id)}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}

type EnvironmentFormProps = {
  environment?: Environment
  onSave: () => void
}

const EnvironmentForm: React.FC<EnvironmentFormProps> = ({
  environment,
  onSave,
}) => {
  const { pop } = useNavigation()
  const [variables, setVariables] = useState<
    Array<{ key: string; value: string }>
  >(
    environment
      ? Object.entries(environment.variables).map(([key, value]) => ({
          key,
          value,
        }))
      : [{ key: "", value: "" }]
  )

  const handleSubmit = async (formValues: {
    name: string
    [key: string]: string
  }) => {
    try {
      const envVariables: Record<string, string> = {}
      variables.forEach(({ key, value }) => {
        if (key.trim()) {
          envVariables[key.trim()] = value
        }
      })

      const env: Environment = {
        id:
          environment?.id ||
          `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: formValues.name,
        variables: envVariables,
        createdAt: environment?.createdAt || Date.now(),
        updatedAt: Date.now(),
      }

      await saveEnvironment(env)
      onSave()
      pop()
    } catch (error) {
      showToast({
        title: "Failed to save",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      })
    }
  }

  return (
    <Form
      navigationTitle={environment ? "Edit Environment" : "Create Environment"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={environment ? "Update Environment" : "Create Environment"}
            icon={Icon.SaveDocument}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Environment Name"
        defaultValue={environment?.name}
        placeholder="e.g., Development, Staging, Production"
      />
      <Form.Separator />
      <Form.Description
        title="Variables"
        text="Add variables that can be used in URLs and headers using {{variable_name}} syntax"
      />
      {variables.map((variable, index) => (
        <React.Fragment key={index}>
          <Form.TextField
            id={`var_key_${index}`}
            title="Variable Name"
            defaultValue={variable.key}
            placeholder="e.g., base_url, api_key"
            onChange={(value) => {
              const newVars = [...variables]
              newVars[index].key = value
              setVariables(newVars)
            }}
          />
          <Form.TextField
            id={`var_value_${index}`}
            title="Value"
            defaultValue={variable.value}
            placeholder="e.g., https://api.example.com"
            onChange={(value) => {
              const newVars = [...variables]
              newVars[index].value = value
              setVariables(newVars)
            }}
          />
          {index < variables.length - 1 && <Form.Separator />}
        </React.Fragment>
      ))}
      <Form.Description
        text={`You have ${variables.length} variable(s). Add more by editing this form.`}
      />
    </Form>
  )
}
