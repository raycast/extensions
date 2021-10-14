import { Form, getPreferenceValues, Icon, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { PersonalWorkspace, WorkspacesEntity } from "./types/SketchGetWorkspaces";
import { Preferences } from "./types/preferences";
import { getWorkspaces, login } from "./utils/functions";
import { getSelectedWorkspace } from "./utils/storage";

interface Workspaces {
  personalWorkspaces: PersonalWorkspace;
  workspaces?: WorkspacesEntity[] | null;
}

export default function Command() {
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [token, setToken] = useState<string>();
  const [allWorkspaces, setAllWorkspaces] = useState<Workspaces>();
  const [loginError, setLoginError] = useState<string>();

  if (loginError) {
    showToast(ToastStyle.Failure, loginError);
  }

  const handleSubmit = async (value: string) => {
    if (!value) showToast(ToastStyle.Failure, "No workspace selected!");
    setSelectedWorkspace(value);
    await setLocalStorageItem("selectedWorkspace", value);
    showToast(ToastStyle.Success, "Workspace set!");
  };

  useEffect(() => {
    async function fetch() {
      const { email, password }: Preferences = getPreferenceValues();
      try {
        const fetchedToken: string = await login(email, password);
        setToken(fetchedToken);
        const storedSelectedWorkspace = await getSelectedWorkspace();
        if (storedSelectedWorkspace) setSelectedWorkspace(JSON.stringify(storedSelectedWorkspace));
      } catch (error) {
        setLoginError((error as ErrorEvent).message);
      }
    }
    fetch();
  }, []);

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!token) return;
      try {
        const fetchedWorkspaces = await getWorkspaces(token);
        const { personalWorkspace, workspaces } = fetchedWorkspaces.data.me;
        setAllWorkspaces({ personalWorkspaces: personalWorkspace, workspaces: workspaces });
      } catch (error) {
        setLoginError((error as ErrorEvent).message);
      }
    }
    fetchWorkspaces();
  }, [token]);
  return (
    <Form isLoading={!allWorkspaces && !loginError}>
      <Form.Dropdown
        defaultValue={selectedWorkspace}
        onChange={(value) => handleSubmit(value)}
        id="workspaces"
        title="Set Workspace"
      >
        <>
          {allWorkspaces && (
            <Form.Dropdown.Item
              icon={allWorkspaces.personalWorkspaces.avatar ?? Icon.Person}
              value={JSON.stringify({
                name: allWorkspaces.personalWorkspaces.name,
                identifier: allWorkspaces.personalWorkspaces.identifier,
              })}
              title={allWorkspaces.personalWorkspaces.name}
            />
          )}
          {allWorkspaces?.workspaces?.map((workspace) => {
            return (
              <Form.Dropdown.Item
                icon={workspace.avatar.small ?? undefined}
                key={workspace.identifier}
                value={JSON.stringify({
                  name: workspace.name,
                  identifier: workspace.identifier,
                })}
                title={workspace.name}
              />
            );
          })}
        </>
      </Form.Dropdown>
    </Form>
  );
}
