import { Icon, List } from "@raycast/api";

export default function LinkOrText({ title, target }: { title: string, target: string }) {
    return target ? <List.Item.Detail.Metadata.Link title={title} text={target} target={target} /> : <List.Item.Detail.Metadata.Label title={title} text="N/A" />
}