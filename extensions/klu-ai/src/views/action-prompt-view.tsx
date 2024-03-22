import useActions from "@/hooks/use-actions";
import { useSelectedApplication } from "@/hooks/use-application";
import useApplications from "@/hooks/use-applications";
import { PersistedAction } from "@kluai/core";
import { Form } from "@raycast/api";
import { useCallback, useState } from "react";
import ActionPromptForm from "./action/action-prompt-form";

const ActionPromptView = () => {
  const { data: apps, isLoading: isAppsLoading } = useApplications();
  const { selectedApp, setSelectedApp } = useSelectedApplication();

  const { data: actions, revalidate: revalidateActions, isLoading: isActionsLoading } = useActions();

  const [selectedAction, setSelectedAction] = useState<PersistedAction | undefined>(actions?.[0]);

  const onChangeApp = useCallback(
    (value: string) => {
      const app = apps?.find((_) => _.guid === value);
      if (apps?.length === 0) return;
      if (app === undefined || !app) return setSelectedApp(apps?.[0]);
      setSelectedApp(app);
      revalidateActions();
    },
    [apps],
  );

  const onChangeAction = useCallback(
    (value: string) => {
      const action = actions?.find((_) => _.guid === value);
      if (actions?.length === 0) return;
      if (action === undefined || !action) return setSelectedAction(actions?.[0]);
      setSelectedAction(action);
    },
    [actions],
  );

  const AppsActionSelection = () => (
    <>
      <Form.Dropdown id="application" title="Application" defaultValue={selectedApp?.guid} onChange={onChangeApp}>
        {apps?.map((a) => {
          return <Form.Dropdown.Item key={a.guid} value={a.guid} title={a.name} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="action" title="Action" onChange={onChangeAction}>
        {actions?.map((a) => {
          return <Form.Dropdown.Item key={a.guid} value={a.guid} title={a.name} />;
        })}
      </Form.Dropdown>
      <Form.Separator />
    </>
  );

  return (
    <ActionPromptForm
      guid={selectedAction?.guid ?? ""}
      variables={selectedAction?.meta_data?.variables ?? []}
      isLoading={isActionsLoading || isAppsLoading}
    >
      <AppsActionSelection />
    </ActionPromptForm>
  );
};

export default ActionPromptView;
