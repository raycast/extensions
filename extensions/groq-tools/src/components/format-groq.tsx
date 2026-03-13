import {
  type ComponentType,
  type SetStateAction,
  type Dispatch,
  useState,
  useEffect,
} from 'react'

import {
  Detail,
  ActionPanel,
  Action,
  Form,
  Icon,
  Toast,
  showToast,
} from '@raycast/api'

import { type Groqfmt, type GroqfmtResultEnhanced, format } from '@groqfmt/wasm'
import { suspend } from 'suspend-react'
import loadGroqfmt from '../lib/load-groqfmt'

type Route = 'input' | 'output'

interface Props {
  defaultInput: string
}

const FormatGroq: ComponentType<Props> = props => {
  const groqfmt = suspend(loadGroqfmt, ['groqfmt'])

  const formatGroq = useFormatGroq({
    props,
    groqfmt,
  })

  const { route, result, inputProps, setInputAndSubmit, clearInput, setRoute } =
    formatGroq

  useEffect(() => {
    if (route === 'output' && result?.error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Error',
        message: result.error.message,
        primaryAction: {
          title: 'Edit Input',
          onAction() {
            setRoute('input')
          },
        },
      })
    }
  }, [result?.error, route])

  if (route === 'input') {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title='Format'
              icon={Icon.CheckCircle}
              onSubmit={({ input }: { input: string }) =>
                setInputAndSubmit(input)
              }
            />
            <Action
              title='Clear Input'
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={clearInput}
            />
          </ActionPanel>
        }
      >
        <Form.TextArea
          id='input'
          title='Input'
          info='GROQ query or URL.'
          placeholder='GROQ query or URL.'
          autoFocus
          {...inputProps}
        />
      </Form>
    )
  }

  if (route === 'output' && typeof result?.error !== 'undefined') {
    return <Error {...formatGroq} />
  }

  if (route === 'output' && result) {
    return (
      <Detail
        markdown={'```json\n' + result.result + '\n```'}
        metadata={
          result.inputMode === 'url' ? (
            <QueryMetadata result={result} />
          ) : undefined
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title='Copy GROQ to Clipboard'
              content={result.result ?? ''}
            />
            {result.inputMode === 'url' && (
              <Action.CopyToClipboard
                title='Copy Details to Clipboard'
                content={JSON.stringify(getDetailsFromResult(result), null, 2)}
              />
            )}
            {result.inputMode === 'url' &&
              typeof result.params !== 'undefined' && (
                <Action.CopyToClipboard
                  title='Copy Parameters to Clipboard'
                  content={JSON.stringify(result.params, null, 2)}
                />
              )}
            <Action
              title='Edit Input'
              icon={Icon.Pencil}
              onAction={() => setRoute('input')}
            />
          </ActionPanel>
        }
      />
    )
  }

  return null
}

export default FormatGroq

interface FormatGroq {
  route: Route
  input?: string
  result?: GroqfmtResultEnhanced
  setInputAndSubmit: Dispatch<string>
  clearInput: () => void
  setRoute: Dispatch<SetStateAction<Route>>
  inputProps: {
    value: string
    onChange: Dispatch<string>
    onBlur: () => void
    error: string | undefined
  }
}

interface UseFormatGroqOptions {
  props: Props
  groqfmt: Groqfmt
}

function inputIsValid(input: string): boolean {
  return input !== ''
}

function useFormatGroq({ props, groqfmt }: UseFormatGroqOptions): FormatGroq {
  const [input, setInput] = useState<string>(props.defaultInput)
  const [route, setRoute] = useState<Route>(input === '' ? 'input' : 'output')
  const [hasBlurred, setHasBlurred] = useState<boolean>(false)

  return {
    route,
    input,
    setRoute,
    setInputAndSubmit(input: string) {
      setInput(input)
      setHasBlurred(true)

      if (inputIsValid(input)) {
        setRoute('output')
      }
    },
    clearInput() {
      setInput('')
    },
    inputProps: {
      value: input,
      onChange: setInput,
      onBlur: () => setHasBlurred(true),
      error:
        hasBlurred && !inputIsValid(input) ? 'Input is required.' : undefined,
    },
    result:
      typeof input === 'undefined'
        ? undefined
        : format({
            input,
            groqfmt,
          }),
  }
}

interface QueryMetadataProps {
  result: GroqfmtResultEnhanced & { inputMode: 'url' }
}

const QueryMetadata: ComponentType<QueryMetadataProps> = ({ result }) => (
  <Detail.Metadata>
    <Detail.Metadata.Label title='Project id' text={result.projectId} />
    <Detail.Metadata.Label title='Dataset' text={result.dataset} />
    <Detail.Metadata.Label title='CDN' text={result.cdn ? 'Yes' : 'No'} />
    <Detail.Metadata.Label title='API Version' text={result.apiVersion} />
    {typeof result.perspective !== 'undefined' && (
      <Detail.Metadata.Label title='Perspective' text={result.perspective} />
    )}
    {typeof result.params !== 'undefined' && (
      <>
        <Detail.Metadata.Separator />
        {Object.entries(result.params).map(([key, value]) => (
          <Detail.Metadata.Label key={key} title={`$${key}`} text={value} />
        ))}
      </>
    )}
  </Detail.Metadata>
)

function getDetailsFromResult({
  projectId,
  dataset,
  cdn,
  apiVersion,
  perspective,
}: GroqfmtResultEnhanced & {
  inputMode: 'url'
}): Pick<
  GroqfmtResultEnhanced & {
    inputMode: 'url'
  },
  'projectId' | 'dataset' | 'cdn' | 'apiVersion' | 'perspective'
> {
  return { projectId, dataset, cdn, apiVersion, perspective }
}

const Error: ComponentType<FormatGroq> = ({ result, setRoute }) => (
  <Detail
    markdown={`# Error
\`\`\`json
${result?.error?.message}
\`\`\``}
    metadata={
      <Detail.Metadata>
        {typeof result?.error?.begin !== 'undefined' && (
          <Detail.Metadata.Label
            title='Begin'
            text={result.error.begin.toString()}
          />
        )}
        {typeof result?.error?.end !== 'undefined' && (
          <Detail.Metadata.Label
            title='End'
            text={result.error.end.toString()}
          />
        )}
      </Detail.Metadata>
    }
    actions={
      <ActionPanel>
        <Action
          title='Edit Input'
          icon={Icon.Pencil}
          onAction={() => setRoute('input')}
        />
      </ActionPanel>
    }
  />
)
