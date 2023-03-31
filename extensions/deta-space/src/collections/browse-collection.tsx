import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useSpace } from "../hooks/use-space";

type Collection = {
    id: string;
    name: string;
    created_at: string;
    migrated?: boolean;
}

type Drive = {
    name: string;
    collection_id: string;
    status: string;
}

type Base = {
    name: string;
    collection_id: string;
    status: string;
}

type BaseResponse = {
    bases: Base[]
}

type DriveResponse = {
    drives: Drive[]
}

function BaseList(props: { collection: Collection }) {
    const { data } = useSpace<BaseResponse>(`/collections/${props.collection.id}/bases`)

    return (
        <List.Section title="Bases">
            {data?.bases.map((base) => (
                <BaseItem key={base.name} base={base} />
            ))}
        </List.Section>
    );
}


function DriveList(props: { collection: Collection }) {
    const { data } = useSpace<DriveResponse>(`/collections/${props.collection.id}/drives`)

    return (
        <List.Section title="Drives">
            {data?.drives.map((drive) => (
                <DriveItem key={drive.name} drive={drive} />
            ))}
        </List.Section>
    );
}


export function BrowseCollection(props: { collection: Collection }) {
    return (
        <List navigationTitle={props.collection.name}>
            <BaseList collection={props.collection} />
            <DriveList collection={props.collection} />
        </List >
    );
}

function BaseItem(props: { base: Base }) {
    return <List.Item
        key={props.base.name}
        icon={Icon.List}
        title={props.base.name}
        accessories={[
            { tag: { value: props.base.status, color: Color.Green } },
        ]}
        actions={
            <ActionPanel>
                <Action.CopyToClipboard title="Copy name" content={props.base.name} />
            </ActionPanel>
        }
    />
}

function DriveItem(props: { drive: Drive }) {
    return <List.Item
        key={props.drive.name}
        icon={Icon.HardDrive}
        title={props.drive.name}
        accessories={[
            { tag: { value: props.drive.status, color: Color.Green } },
        ]}
        actions={
            <ActionPanel>
                <Action.CopyToClipboard title="Copy name" content={props.drive.name} />
            </ActionPanel>
        }
    />
}