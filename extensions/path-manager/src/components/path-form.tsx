import {
  Form,
  showToast,
  popToRoot,
  useNavigation,
  Toast,
  ActionPanel,
  Action,
  environment,
} from '@raycast/api'
import { useState } from 'react'
import { promises as fs, constants } from 'fs'
import path from 'path'

const STORAGE_PATH: string = path.join(environment.supportPath, 'paths.json')

interface PathFormProps {
  initialPath?: string
  initialAlias?: string
  mode: 'add' | 'edit'
}

export default function PathForm({
  initialPath = '',
  initialAlias = '',
  mode,
}: PathFormProps) {
  const { pop } = useNavigation()
  const [pathValue, setPath] = useState<string>(initialPath)
  const [aliasValue, setAlias] = useState<string>(initialAlias)
  const [pathError, setPathError] = useState<string | undefined>()
  const [aliasError, setAliasError] = useState<string | undefined>()

  function dropPathErrorIfNeeded() {
    if (pathError && pathError.length > 0) {
      setPathError(undefined)
    }
  }

  function dropAliasErrorIfNeeded() {
    if (aliasError && aliasError.length > 0) {
      setAliasError(undefined)
    }
  }

  async function isDirectory(path: string): Promise<boolean> {
    try {
      const stat = await fs.stat(path)
      return stat.isDirectory()
    } catch (error: unknown) {
      return false
    }
  }

  async function validateForm(): Promise<boolean> {
    let isValid = true

    if (pathValue.length === 0) {
      setPathError('Please enter a path.')
      isValid = false
    } else if (!(await isDirectory(pathValue))) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Invalid Directory Path',
        message: 'This path does not exist on your system.',
      })
      isValid = false
    }

    if (aliasValue.length === 0) {
      setAliasError('Please enter an alias.')
      isValid = false
    }
    return isValid
  }

  async function handleSubmit() {
    try {
      await ensureFileExists()
      if (await validateForm()) {
        // Check if add or update form type
        const data = await fetchPaths()
        if (mode === 'add') {
          handleAdd(pathValue, aliasValue, data)
        } else {
          handleUpdate(pathValue, aliasValue, data, initialAlias)
        }
        pop()
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to load paths',
        message: `${error}`,
      })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === 'add' ? 'Add Path' : 'Save changes'}
            onSubmit={handleSubmit}
          />
          <Action title='Cancel' onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id='pathField'
        value={pathValue}
        title='Directory Path'
        placeholder='Enter your path'
        error={pathError}
        onChange={(value) => {
          setPath(value)
          dropPathErrorIfNeeded()
        }}
      />
      <Form.TextField
        id='aliasField'
        value={aliasValue}
        title='Alias'
        placeholder='Enter an alias for your path'
        error={aliasError}
        onChange={(value) => {
          setAlias(value)
          dropAliasErrorIfNeeded()
        }}
      />
    </Form>
  )
}

async function handleAdd(
  pathValue: string,
  aliasValue: string,
  data: Record<string, string>
) {
  try {
    // Check if alias already exists
    if (data[aliasValue]) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Alias In Use',
        message: `The alias "${aliasValue}" is already used for the path "${data[aliasValue]}". Please choose a different alias.`,
      })
      return
    }

    // Save the new path and alias
    data[aliasValue] = pathValue
    await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2))

    // Provide feedback and close Raycast window
    showToast({
      style: Toast.Style.Success,
      title: 'Success',
      message: 'Path has been added!',
    })
    popToRoot()
  } catch (error: unknown) {
    if (error instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error saving data',
        message: error.message,
      })
    } else {
      throw error
    }
  }
}

async function handleUpdate(
  newPath: string,
  newAlias: string,
  data: Record<string, string>,
  initialAlias: string
) {
  try {
    // If the alias is being changed, check if new alias already exists
    if (initialAlias !== newAlias && data[newAlias]) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Alias In Use',
        message: `The alias "${newAlias}" is already used for the path "${data[newAlias]}". Please choose a different alias.`,
      })
      return
    }

    // Remove the originalAlias (if it exists) and set the new data.
    if (initialAlias) {
      delete data[initialAlias]
    }
    data[newAlias] = newPath

    await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2))

    showToast({
      style: Toast.Style.Success,
      title: 'Success',
      message: 'Path has been updated!',
    })
    popToRoot()
  } catch (error: unknown) {
    if (error instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error updating data',
        message: error.message,
      })
    } else {
      throw error
    }
  }
}

async function fetchPaths() {
  const rawData = await fs.readFile(STORAGE_PATH, 'utf-8')
  const parsedData: Record<string, string> = JSON.parse(rawData)
  return parsedData
}

async function ensureFileExists() {
  try {
    await fs.access(STORAGE_PATH, constants.F_OK)
  } catch (error) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      // File does not exist, create it
      await fs.writeFile(STORAGE_PATH, JSON.stringify({}, null, 2))
    } else {
      // Other errors
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: 'An error occurred while ensuring file existence.',
      })
      throw error
    }
  }
}
