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

import Actions from "./components/Actions";
import SearchCodeResults from "./components/SearchCodeResults";
import useInstances from "./hooks/useInstances";
import useSearchGroups, { DEFAULT_SEARCH_GROUP_SCOPE } from "./hooks/useSearchGroups";
import { Instance } from "./types";
import { instanceLabel } from "./utils/instanceLabel";
import { matchInstance, notFoundToast, NO_PROFILES_TOAST } from "./utils/instanceResolver";

export default function SearchCode(props: LaunchProps) {
  const { instanceName, term: argTerm } = props.arguments ?? {};
  const { instances, selectedInstance, setSelectedInstance, isLoading: isLoadingInstances } = useInstances();
  const { push } = useNavigation();
  const argInitial = argTerm?.trim() || null;

  const [groupScope, setGroupScope] = useCachedState<string>("search-code-group-scope", DEFAULT_SEARCH_GROUP_SCOPE);
  const { isLoading: isLoadingGroups, groups: fetchedGroups } = useSearchGroups(selectedInstance);

  useEffect(() => {
    if (isLoadingInstances) return;
    if (instances.length === 0) {
      showToast(NO_PROFILES_TOAST);
      popToRoot();
      return;
    }
    if (instanceName) {
      const found = matchInstance(instances, instanceName);
      if (found && found.id !== selectedInstance?.id) {
        setSelectedInstance(found);
        LocalStorage.setItem("selected-instance", JSON.stringify(found));
      } else if (!found) {
        showToast(notFoundToast(instanceName));
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
    const found = instances.find((i) => i.id === newValue);
    if (found) {
      setSelectedInstance(found);
      LocalStorage.setItem("selected-instance", JSON.stringify(found));
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
                showToast({
                  style: Toast.Style.Failure,
                  title: "Missing search term",
                  message: "Please enter a term to search",
                });
                return;
              }
              if (values.group) setGroupScope(values.group);
              push(<SearchCodeResults searchTerm={t} />);
            }}
          />
          <Actions />
        </ActionPanel>
      }
    >
      <Form.Description text="Search inside ServiceNow scripts (business rules, script includes, client scripts, UI scripts, etc.)." />
      <Form.TextField id="term" title="Term" placeholder="e.g. GlideRecord" defaultValue={argTerm ?? ""} />
      <Form.Dropdown
        id="group"
        title="Search Group"
        value={groupScope}
        onChange={setGroupScope}
        isLoading={isLoadingGroups}
      >
        {fetchedGroups.map((option) => (
          <Form.Dropdown.Item
            key={option.scope}
            title={option.label}
            value={option.scope}
            icon={Icon.MagnifyingGlass}
          />
        ))}
      </Form.Dropdown>
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
            title={instanceLabel(instance)}
            value={instance.id}
            icon={{
              source: instanceId == instance.id ? Icon.CheckCircle : Icon.Circle,
              tintColor: instance.color,
            }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
