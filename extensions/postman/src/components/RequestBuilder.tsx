import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api"
import {
  HeaderType,
  MethodsType,
  ParamsType,
  URLType,
  VariablesType,
} from "../types"
import { prettifyPathVariables } from "../utils"
import { ResponseDetails } from "./ResponseDetails"

type RequestBuilderProps = {
  name: string
  url: URLType
  variables: VariablesType | undefined
  params: ParamsType | undefined
  header: HeaderType[] | undefined
  method: MethodsType | undefined
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  name,
  params,
  variables,
  ...rest
}) => {
  const { push } = useNavigation()

  return (
    <Form
      navigationTitle={name + " Form"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Request"
            icon={Icon.Upload}
            onSubmit={(e) => {
              push(<ResponseDetails payload={e} {...rest} />)
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Environment Variables" />
      {variables ? (
        variables.map((pathVariable, idx) => (
          <Form.TextField
            key={idx}
            id={pathVariable}
            title={prettifyPathVariables(pathVariable)}
          />
        ))
      ) : (
        <Form.Description text="No environment variables found for this request." />
      )}
      <Form.Separator />
      <Form.Description text="Params" />
      {params ? (
        params.map((param, idx) => (
          <Form.TextField
            key={idx}
            id={param.key}
            title={param.key}
            defaultValue={param.value}
            info={
              "You can leave this field blank if you don't want to send this param."
            }
          />
        ))
      ) : (
        <Form.Description text="No params found for this request." />
      )}
    </Form>
  )
}
