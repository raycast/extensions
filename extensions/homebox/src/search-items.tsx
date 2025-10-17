import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { Item, Label, Location } from "./types";
import { useState } from "react";
import { buildUrl, HomeBoxProvider, useToken } from "./homebox";

export default function Command() {
  return <HomeBoxProvider>
    <SearchItems />
  </HomeBoxProvider>
}
function SearchItems() {
  const {token} = useToken();
  const [query, setQuery] = useState("");
  
  const {isLoading, data: items, pagination, mutate} = useFetch((options) => buildUrl(`items?q=${query}&page=${options.page+1}&pageSize=20`), {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `${token}`
    },
    mapResult(result) {
      const r = result as {"page": number,
  "pageSize": number,
  "total": number,
  "items": Item[]}
      return {
        data: r.items,
        hasMore: (r.page*r.pageSize)<r.total
      }
    },
    initialData: []
  })

  return <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setQuery}>
    {items.map(item => <List.Item key={item.id} icon={Icon.Box
    } title={item.name} accessories={[
      {text: item.quantity.toString(), tooltip: "Quantity"},
      {icon: item.insured ? "✅" : "❌", tooltip: "Insured"},
      {text: item.purchasePrice.toString(), tooltip: "Purchase Price"},
      {icon: Icon.Tag, text: item.labels.length.toString(), tooltip: "Labels"}
    ]} actions={<ActionPanel>
      <Action.Push title="Create Item / Asset" target={<CreateItem token={token} />} onPop={mutate} />
    <Action icon={Icon.Trash} title="Delete" onAction={() => confirmAlert({
      title: "Confirm",
      message: "Are you sure you want to delete this item?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Confirm",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", item.name);
          try {
            const response = await fetch(buildUrl(`items/${item.id}`), {
              method: "DELETE",
              headers: {
                Authorization: `${token}`
              }
            })
            if (response.status!==204) {
              if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error(response.statusText);
              const result = await response.json() as {error: string}
              throw new Error(result.error);
            }
            toast.style = Toast.Style.Success
            toast.title = "Deleted"
            await mutate()
          } catch (error) {
            toast.style = Toast.Style.Failure
            toast.title = "Failed"
            toast.message = `${error}`
          }
        },
      }
    })} style={Action.Style.Destructive} />
    </ActionPanel>} />)}
  </List>
}

function CreateItem({token}:{token: string}) {
  const {pop} = useNavigation()
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `${token}`
  }
  const {isLoading: isLoadingLocations, data: locations} = useFetch<Location[]>(buildUrl("locations"), {
    headers
  })
  const {isLoading: isLoadingLabels, data: labels} = useFetch<Label[]>(buildUrl("labels"), {
    headers
  })
  type FormValues = {
    locationId: string;
    name: string;
    quantity: string
    description: string;
    labelIds: string[]
  }
  const {handleSubmit, itemProps} = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const response = await fetch(buildUrl("items"), {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...values,
            quantity: +values.quantity
          })
        })
        if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error(response.statusText);
        const result = await response.json();
        if (!response.ok) {
          const err = result as {error: string; fields?: {[field:string]: string}};
          if (err.fields) throw new Error(Object.values(err.fields)[0])
            throw new Error(err.error);
        }
        toast.style = Toast.Style.Success
        toast.title = "Created"
        toast.message = (result as Item).name;

        pop()
      } catch (error) {
        toast.style = Toast.Style.Failure
        toast.title = "Failed"
        toast.message = `${error}`
      }
    },
    validation: {
      name(value) {
        if (!value) return "The item is required";
        if (value.length > 255) return "Name is too long";
      },
      quantity(value) {
        if (value && !Number(value)) return "The item must be a number"
      },
      description(value) {
        if (value && value.length > 1000) return "Description is too long";
      },
    }
  })
  return <Form isLoading={isLoadingLocations || isLoadingLabels} actions={<ActionPanel>
    <Action.SubmitForm icon={Icon.Box} title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Dropdown title="Parent Location" {...itemProps.locationId}>
      <Form.Dropdown.Item title="Select a Location" value="" />
      {locations?.map(location => <Form.Dropdown.Item key={location.id} title={location.name} value={location.id} />)}
    </Form.Dropdown>
<Form.TextField title="Item Name" {...itemProps.name} />
<Form.TextField title="Item Quantity" {...itemProps.quantity} />
<Form.TextArea title="Item Description" {...itemProps.description} />
<Form.TagPicker title="Labels" placeholder="Select Labels" {...itemProps.labelIds}>
  {labels?.map(label => <Form.TagPicker.Item key={label.id} title={label.name} value={label.id} />)}
</Form.TagPicker>
  </Form>
}