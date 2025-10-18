import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { CreateItemRequest } from "./types";
import { useState } from "react";
import { buildUrl, homebox } from "./homebox";
import { useItem, useItems, useLabels, useLocations, useToken } from "./hooks";

export default function SearchItems() {
  const [query, setQuery] = useState("");
  const {isLoading, items, pagination, mutate} = useItems(query);
  
  return <List isLoading={isLoading} pagination={pagination} onSearchTextChange={setQuery}>
    {items.map(item => <List.Item key={item.id} icon={Icon.Box
    } title={item.name} accessories={[
      {text: item.quantity.toString(), tooltip: "Quantity"},
      {icon: item.insured ? "✅" : "❌", tooltip: "Insured"},
      {text: item.purchasePrice.toString(), tooltip: "Purchase Price"},
      {icon: Icon.Tag, text: item.labels.length.toString(), tooltip: "Labels"}
    ]} actions={<ActionPanel>
      <Action.Push icon={Icon.Box} title="View Item" target={<ViewItem itemId={item.id} />} />
      <Action.Push icon={Icon.Plus} title="Create Item / Asset" target={<CreateItem />} onPop={mutate} />
    <Action icon={Icon.Trash} title="Delete" onAction={() => confirmAlert({
      title: "Confirm",
      message: "Are you sure you want to delete this item?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Confirm",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", item.name);
          try {
            await mutate(
              homebox.items.delete(item.id), {
                optimisticUpdate(data) {
                  return data.filter(i=>i.id!==item.id)
                },
                shouldRevalidateAfter: false
              }
            )
            toast.style = Toast.Style.Success
            toast.title = "Deleted"
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

function ViewItem({itemId}:{itemId:string}) {
  // const {isLoadingToken, token} = useToken();
  // console.log(token)
  const {isLoading,item} = useItem(itemId);
  // const markdown = (item?.attachments.length && !!token) ? `![](${buildUrl(`items/${itemId}/attachments/${item.attachments[0].id}?access_token=${token}`)}` : "";
  const markdown = ""
  return <List isLoading={isLoading} isShowingDetail>
    <List.Item title="Details" detail={<List.Item.Detail markdown={markdown} metadata={item && <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Quantity" text={item.quantity.toString()} />
      <List.Item.Detail.Metadata.Label title="Serial Number" text={item.serialNumber} />
      <List.Item.Detail.Metadata.Label title="Model Number" text={item.modelNumber} />
      <List.Item.Detail.Metadata.Label title="Manufacturer" text={item.manufacturer} />
      <List.Item.Detail.Metadata.Label title="Insured" text={item.insured ? "Yes" : "No"} />
      <List.Item.Detail.Metadata.Label title="Archived" text={item.archived ? "Yes" : "No"} />
      <List.Item.Detail.Metadata.Label title="Notes" text={item.notes} />
      <List.Item.Detail.Metadata.Label title="Asset ID" text={item.assetId} />
    </List.Item.Detail.Metadata>} />} />
  </List>
}

function CreateItem() {
  const {pop} = useNavigation()
  const {isLoading: isLoadingLocations, labels} = useLabels();
  const {isLoading: isLoadingLabels, locations} = useLocations();
  type FormValues = Omit<CreateItemRequest, "quantity"> & {
    quantity: string
  }
  const {handleSubmit, itemProps} = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const result = await homebox.items.create({
          ...values,
          quantity: +values.quantity
        })
        toast.style = Toast.Style.Success
        toast.title = "Created"
        toast.message = result.name
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
    <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Dropdown title="Parent Location" {...itemProps.locationId}>
      <Form.Dropdown.Item title="Select a Location" value="" />
      {locations.map(location => <Form.Dropdown.Item key={location.id} icon={Icon.Pin} title={location.name} value={location.id} />)}
    </Form.Dropdown>
<Form.TextField title="Item Name" {...itemProps.name} />
<Form.TextField title="Item Quantity" {...itemProps.quantity} />
<Form.TextArea title="Item Description" {...itemProps.description} />
<Form.TagPicker title="Labels" placeholder="Select Labels" {...itemProps.labelIds}>
  {labels.map(label => <Form.TagPicker.Item key={label.id} icon={Icon.Tag} title={label.name} value={label.id} />)}
</Form.TagPicker>
  </Form>
}