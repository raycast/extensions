import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import path from "path";
import { readFileSync } from "node:fs";
import DocumentSearch from "./DocumentSearch";
import { Instance } from "./queryInstances";

interface Preferences {
  instancesConfigurationPath: string;
}

const instancesConfigurationPath = path.resolve(getPreferenceValues<Preferences>().instancesConfigurationPath);
const instancesConfiguration = readFileSync(instancesConfigurationPath, "utf-8");
const instances: Instance[] = JSON.parse(instancesConfiguration);

const Command = () => {
  if (instances.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "https://www.getoutline.com/images/logo.svg" }}
          title="Outline Instances Configuration Missing"
          description="Please configure at least one Outline instance in the configuration file."
        />
      </List>
    );
  } else if (instances.length === 1) {
    return <DocumentSearch instances={instances} />;
  } else {
    return (
      <List searchBarPlaceholder="Select an instance to search in or search everywhere">
        <List.Section subtitle={instances.length.toString()} title="Instances">
          {instances.map((instance, index) => (
            <List.Item
              actions={
                <ActionPanel>
                  <Action.Push title="Search Documents" target={<DocumentSearch instances={[instance]} />} />
                </ActionPanel>
              }
              key={index}
              title={`Search in ${instance.name}`}
            />
          ))}
        </List.Section>
        <List.Section title="All Instances">
          <List.Item
            actions={
              <ActionPanel>
                <Action.Push title="Search Documents" target={<DocumentSearch instances={instances} />} />
              </ActionPanel>
            }
            title="Search everywhere"
          />
        </List.Section>
      </List>
    );
  }
};

export default Command;
