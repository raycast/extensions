import { Action, ActionPanel, Form, getPreferenceValues, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { API_HEADERS, API_URL, parseInboundResponse } from "./inbound";
import { Domain } from "./types";

export default function Command() {
  const {isLoading,data:domains} = useFetch(API_URL + "domains", {
    headers: API_HEADERS,
    parseResponse: parseInboundResponse,
    mapResult(result: {data: Domain[]}) {
      return {
        data: result.data
      }
    },
    initialData: []
  })

 return <List isLoading={isLoading}>
  {!isLoading && !domains.length ? <List.EmptyView icon={Icon.Globe} title="No domains found" description="Start by adding a domain to create email addresses." actions={<ActionPanel>
    <Action.Push icon={Icon.PlusCircle} title="Add Your First Domain" target={<AddDomain />} />
  </ActionPanel>} /> : domains.map(domain => <List.Item key={domain.id} title={domain.domain} />)}
 </List>
}

function AddDomain() {
  const {pop} = useNavigation();
  const {handleSubmit,itemProps} = useForm<{domain: string}>({
    async onSubmit(values) {
const toast = await showToast(Toast.Style.Animated, "Adding Domain", values.domain);
      try {
        const response = await fetch(API_URL + "domains", {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({
            domain: values.domain
          })
        })
        await parseInboundResponse(response);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
domain: FormValidation.Required
    }
  })
  return <Form actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.PlusCircle} title="Add Domain" onSubmit={handleSubmit} />
  </ActionPanel>}>
  <Form.TextField title="Name" placeholder="example.com" {...itemProps.domain} />
  </Form>
}