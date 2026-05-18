import { useEffect } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import SearchCodeResults from "./components/SearchCodeResults";
import { DEFAULT_SEARCH_GROUP_SCOPE, mergeGroupOptions } from "./components/SearchGroupDropdown";
import useInstances from "./hooks/useInstances";
import useSearchGroups from "./hooks/useSearchGroups";
import { Instance } from "./types";

export default function SearchCode(props: LaunchProps) {
  const { instanceName, term: argTerm } = props.arguments ?? {};
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const { push } = useNavigation();
  const argInitial = argTerm?.trim() || null;

  const [groupScope, setGroupScope] = useCachedState<string>("search-code-group-scope", DEFAULT_SEARCH_GROUP_SCOPE);
  const { isLoading: isLoadingGroups, groups: fetchedGroups } = useSearchGroups(selectedInstance);
  const groupOptions = mergeGroupOptions(fetchedGroups);

  useEffect(() => {
    if (isLoadingInstances) return;
    if (instances.length === 0) {
      showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
      popToRoot();
      return;
    }
    if (instanceName) {
      const found = instances.find(
        (i: Instance) =>
          i.name.toLowerCase().includes(instanceName.toLowerCase()) ||
          i.alias?.toLowerCase().includes(instanceName.toLowerCase()),
      );
      if (found && found.id !== selectedInstance?.id) {
        setSelectedInstance(found);
        LocalStorage.setItem("selected-instance", JSON.stringify(found));
      } else if (!found) {
        showToast(
          Toast.Style.Failure,
          "Instance not found",
          `No instance found with URL or alias containing ${instanceName}`,
        );
      }
      return;
    }
    // Self-heal a stale `selected-instance` (the cached profile was deleted by
    // another command) so the Form.Dropdown's value matches one of its items.
    if (selectedInstance && !instances.some((i) => i.id === selectedInstance.id)) {
      setSelectedInstance(instances[0]);
      LocalStorage.setItem("selected-instance", JSON.stringify(instances[0]));
    }
  }, [isLoadingInstances]);

  const onInstanceChange = (newValue: string) => {
    const aux = instances.find((i) => i.id === newValue);
    if (aux) {
      setSelectedInstance(aux);
      LocalStorage.setItem("selected-instance", JSON.stringify(aux));
    }
  };

  const instanceId = selectedInstance?.id ?? "";

  if (argInitial) return <SearchCodeResults searchTerm={argInitial} />;

  return (
    <Form
      navigationTitle="Search Code"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search"
            icon={Icon.MagnifyingGlass}
            onSubmit={(values: { term?: string; group?: string }) => {
              const t = values.term?.trim();
              if (!t) {
                showToast(Toast.Style.Failure, "Missing search term", "Please enter a term to search");
                return;
              }
              if (values.group) setGroupScope(values.group);
              push(<SearchCodeResults searchTerm={t} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Search inside ServiceNow scripts (business rules, script includes, client scripts, UI scripts, etc.)." />
      <Form.TextField id="term" title="Term" placeholder="e.g. GlideRecord" defaultValue={argTerm ?? ""} />
      <Form.Dropdown
        id="instance"
        title="Instance"
        value={instanceId}
        onChange={onInstanceChange}
        isLoading={isLoadingInstances}
      >
        {instances.map((instance: Instance) => (
          <Form.Dropdown.Item
            key={instance.id}
            title={instance.alias ? instance.alias : instance.name}
            value={instance.id}
            icon={{
              source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
              tintColor: instance.color,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="group"
        title="Search Group"
        value={groupScope}
        onChange={setGroupScope}
        isLoading={isLoadingGroups}
      >
        {groupOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.scope}
            title={option.label}
            value={option.scope}
            icon={Icon.MagnifyingGlass}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
