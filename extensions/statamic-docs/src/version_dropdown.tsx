import { List } from "@raycast/api";
import { Version } from "./statamic";

export function VersionDropdown(props: { versions: Version[]; id: string; onChange: (version: string) => void }) {
    const getVersionLabel = (version: Version) => {
        if (version.alpha) {
            return `${version.branch}-alpha`;
        }

        return version.branch;
    };

    return (
        <List.Dropdown tooltip="Select version" onChange={props.onChange} id={props.id} storeValue={true}>
            <List.Dropdown.Section title="Select version">
                {props.versions?.map((version: Version) => (
                    <List.Dropdown.Item title={getVersionLabel(version)} value={version.version} key={version.version} />
                ))}
            </List.Dropdown.Section>
        </List.Dropdown>
    );
}
