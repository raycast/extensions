import { useDatabases } from '@/services/notion/hooks/use-databases'
import { NONE_VALUE } from '@/services/notion/operations/get-databases'
import { formatNotionUrl } from '@/services/notion/utils/format-notion-url'
import { Preferences, storePreferences } from '@/services/storage'
import { Database } from '@/types/database'
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from '@raycast/api'
import { FormValidation, useCachedState, useForm } from '@raycast/utils'
import { useState } from 'react'

type OnboardFormValues = {
  mainDatabase: string
  titleProperty: string
  urlProperty: string
  dateProperty: string
  tagsProperty: string
  statusProperty: string
  assigneeProperty: string
  projectProperty: string
  projectStatusProperty: string
}

const handleOptionalField = (value: string): string | undefined => {
  return value === NONE_VALUE ? undefined : value
}

const normalizeValuesToStore = (
  values: OnboardFormValues,
  relatedDatabaseTitle?: string
): Preferences => {
  const mainDatabase = JSON.parse(values.mainDatabase || '{}')
  const project = JSON.parse(values.projectProperty || '{}')
  const status = JSON.parse(values.statusProperty || '{}')
  const projectStatus = JSON.parse(values.projectStatusProperty || '{}')

  return {
    databaseId: mainDatabase.id,
    databaseName: mainDatabase.name,
    databaseUrl: mainDatabase.url,
    normalizedUrl: formatNotionUrl(mainDatabase.url),
    properties: {
      title: values.titleProperty,
      date: values.dateProperty,
      url: handleOptionalField(values.urlProperty),
      status: {
        type: status.type,
        name: status.name,
        doneName: status.doneName,
        completedStatuses: status.completedStatuses,
        inProgressId: status.inProgressId,
        notStartedId: status.notStartedId,
      },
      tag: handleOptionalField(values.tagsProperty),
      assignee: handleOptionalField(values.assigneeProperty),
      project: project.propertyName,
      relatedDatabase: {
        databaseId: project.databaseId,
        title: relatedDatabaseTitle,
        status: {
          type: projectStatus.type,
          name: projectStatus.name,
          completedStatuses: projectStatus.completedStatuses,
          doneName: projectStatus.doneName,
        },
      },
    },
  }
}

export default function ConfigurationForm({
  revalidate,
  navigation,
}: {
  revalidate?: () => void
  navigation?: boolean
}) {
  const { databases, isLoading } = useDatabases()
  const { pop } = useNavigation()

  const [database, setDatabase] = useCachedState<Database | null>(
    'synced-database',
    null
  )
  const [secondaryDb, setSecondaryDb] = useState<Database | null>(null)

  const { handleSubmit, values, setValue } = useForm<OnboardFormValues>({
    async onSubmit(values) {
      const relatedDatabaseTitle = secondaryDb?.columns.title[0]
      const normalizedValues = normalizeValuesToStore(
        values,
        relatedDatabaseTitle
      )

      await storePreferences(normalizedValues)

      if (revalidate) {
        await revalidate()
      }

      showToast({
        style: Toast.Style.Success,
        title: 'Success',
        message: `Reload the extension to see your changes.`,
      })

      if (navigation) {
        pop()
      }
    },
    validation: {
      mainDatabase: FormValidation.Required,
      titleProperty: FormValidation.Required,
      dateProperty: FormValidation.Required,
    },
    initialValues: {
      mainDatabase: '',
      titleProperty: '',
      urlProperty: '',
      dateProperty: '',
      statusProperty: '',
      tagsProperty: '',
      assigneeProperty: '',
      projectProperty: '',
      projectStatusProperty: '',
    },
  })

  const handleChangeMainDatabase = (value: string) => {
    const valueJson = JSON.parse(value || '{}')
    const database = databases.find((db) => db.id === valueJson.id)

    if (database) {
      // Set database
      setValue('mainDatabase', value)
      setDatabase(database)
      // Set default values
      setValue('titleProperty', database.columns.title[0] || '')
      setValue('dateProperty', database.columns.date[0] || '')
      setValue('statusProperty', database.columns.status[0]?.data.name || '')
      setValue('tagsProperty', database.columns.tags[0]?.value || '')
      setValue('assigneeProperty', database.columns.assignee[0]?.value || '')
      setValue('urlProperty', database.columns.url[0]?.value || '')
      // Handle project property
      const project = database.columns.project[0]?.value || ''
      setValue('projectProperty', project)
      handleSelectRelatedProperty(project)
    }
  }

  const handleSelectRelatedProperty = (value: string) => {
    const property = JSON.parse(value || '{}')
    const database = databases.find((db) => db.id === property.databaseId)

    if (database) {
      setSecondaryDb(database)
    } else {
      setSecondaryDb(null)
    }

    setValue('projectProperty', value)
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mainDatabase"
        title="Database"
        value={values.mainDatabase}
        onChange={handleChangeMainDatabase}
        info="Select the database where you will create tasks through Hypersonic"
        storeValue
      >
        {databases.map((item) => (
          <Form.Dropdown.Item
            key={item.id}
            value={item.value}
            title={item.name}
            icon={{ source: item.image }}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="Required properties" />
      <Form.Dropdown
        id="titleProperty"
        title="Title"
        value={values.titleProperty}
        onChange={(v) => setValue('titleProperty', v)}
        error={
          !values.titleProperty && !isLoading && !!database
            ? 'Required'
            : undefined
        }
        info="Displayed as task name"
        storeValue
      >
        {database?.columns.title.map((item, index) => (
          <Form.Dropdown.Item
            key={`${item}-${index}`}
            value={item}
            title={item}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Date"
        id="dateProperty"
        value={values.dateProperty}
        onChange={(v) => setValue('dateProperty', v)}
        error={
          !values.dateProperty && !isLoading && !!database
            ? 'Required'
            : undefined
        }
        info="Displayed as task due date"
        storeValue
      >
        {database?.columns.date.map((item, index) => (
          <Form.Dropdown.Item
            key={`${item}-${index}`}
            value={item}
            title={item}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Status"
        id="statusProperty"
        value={values.statusProperty}
        onChange={(v) => setValue('statusProperty', v)}
        error={
          !values.statusProperty && !isLoading && !!database
            ? 'Required'
            : undefined
        }
        info="Filter and update tasks based on Status or Checkbox properties"
        storeValue
      >
        {database?.columns.status
          .filter((item) => item.data.name !== 'None')
          .map((item, index) => (
            <Form.Dropdown.Item
              key={`${item.data.name}-${index}`}
              value={item.value}
              title={item.data.name}
            />
          ))}
      </Form.Dropdown>
      <Form.Description text="Optional properties" />
      <Form.Dropdown
        title="Select"
        id="tagsProperty"
        value={values.tagsProperty}
        onChange={(v) => setValue('tagsProperty', v)}
        info="Show additional task labels"
        storeValue
      >
        {database?.columns.tags.map((item, index) => (
          <Form.Dropdown.Item
            key={`${item}-${index}`}
            value={item.value}
            title={item.name}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Person"
        id="assigneeProperty"
        value={values.assigneeProperty}
        onChange={(v) => setValue('assigneeProperty', v)}
        info="Assign tasks to users"
        storeValue
      >
        {database?.columns.assignee.map((item, index) => (
          <Form.Dropdown.Item
            key={`${item}-${index}`}
            value={item.value}
            title={item.name}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="URL"
        id="urlProperty"
        value={values.urlProperty}
        onChange={(v) => setValue('urlProperty', v)}
        info="Attached url"
        storeValue
      >
        {database?.columns?.url?.map((item, index) => (
          <Form.Dropdown.Item
            key={`${item}-${index}`}
            value={item.value}
            title={item.name}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        title="Relation"
        id="projectProperty"
        value={values.projectProperty}
        onChange={handleSelectRelatedProperty}
        info="Add information from related databases"
        storeValue
      >
        {database?.columns.project.map((item, index) => (
          <Form.Dropdown.Item
            key={`${item}-${index}`}
            value={item.value}
            title={item.data.propertyName}
          />
        ))}
      </Form.Dropdown>
      {secondaryDb ? (
        <>
          <Form.Dropdown
            id="secondary-database"
            title="Related database"
            defaultValue={secondaryDb.name}
            storeValue
          >
            <Form.Dropdown.Item
              key={'secondary-database'}
              value={secondaryDb.name}
              title={secondaryDb.name}
              icon={{ source: secondaryDb.image }}
            />
          </Form.Dropdown>
          <Form.Dropdown
            id="projectStatusProperty"
            title="Exclude"
            value={values.projectStatusProperty}
            onChange={(v) => setValue('projectStatusProperty', v)}
            info="Filter related items based on Status or Checkbox properties"
            storeValue
          >
            {secondaryDb.columns.status.map((item, index) => (
              <Form.Dropdown.Item
                key={`${item.data.name}-${index}`}
                value={item.value}
                title={`${item.data.name}${
                  item.data.doneName ? `: ${item.data.doneName}` : ''
                }`}
              />
            ))}
          </Form.Dropdown>
        </>
      ) : null}
    </Form>
  )
}
