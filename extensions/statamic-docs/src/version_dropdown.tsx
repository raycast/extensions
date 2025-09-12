import { List } from "@raycast/api";
import { AvailableVersion } from "./statamic";

export function VersionDropdown(props: { versions: AvailableVersion[]; id: string; onChange: (version: string) => void }) {
    return (
        <List.Dropdown tooltip="Select version" onChange={props.onChange} id={props.id} storeValue={true}>
            <List.Dropdown.Section title="Select version">
                {props.versions.map((version: AvailableVersion) => (
                    <List.Dropdown.Item title={version.branch} value={version.version} key={version.version} />
                ))}
            </List.Dropdown.Section>
        </List.Dropdown>
    );
}
