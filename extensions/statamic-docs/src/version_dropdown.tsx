import { List } from "@raycast/api";
import { Version } from "./statamic";

export function VersionDropdown(props: { versions: Version[]; id: string; onChange: (version: string) => void }) {
    return (
        <List.Dropdown tooltip="Select version" onChange={props.onChange} id={props.id} storeValue={true}>
            <List.Dropdown.Section title="Select version">
                {props.versions.map((version: Version) => (
                    <List.Dropdown.Item title={version.branch} value={version.version} key={version.version} />
                ))}
            </List.Dropdown.Section>
        </List.Dropdown>
    );
}
