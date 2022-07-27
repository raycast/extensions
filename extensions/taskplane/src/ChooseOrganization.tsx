/* eslint-disable @typescript-eslint/no-explicit-any */
import Tasks from "./Tasks";
import axios from "axios";
import { API_URL, AuthContext } from "./lib";
import { showToast, Toast, List, ActionPanel, Action, useNavigation, Icon, Image } from "@raycast/api";
import { useState, useContext, useEffect } from "react";

export default function ChooseOrganization() {
  const { push } = useNavigation();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { token, setToken } = useContext(AuthContext);

  useEffect(() => {
    axios
      .get(`${API_URL}/organizations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setOrganizations(res.data);
        setIsLoading(false);
      })
      .catch(() => {
        showToast(Toast.Style.Failure, "Failed to retrieve workspaces");
        setIsLoading(false);
      });
  }, []);

  return (
    <List
      searchBarPlaceholder="Search workspaces..."
      navigationTitle="Choose a workspace"
      isLoading={isLoading}
      enableFiltering
    >
      {organizations && (
        <List.Section title="Workspaces" key={1}>
          {organizations.map((organization) => (
            <List.Item
              accessoryTitle={`${organization.users.length} member${organization.users.length === 1 ? "" : "s"}`}
              icon={{
                source: `https://ui-avatars.com/api/?name=${organization.name[0]}&background=20293A&color=fff`,
                mask: Image.Mask.RoundedRectangle,
              }}
              accessoryIcon={Icon.Person}
              actions={
                <ActionPanel>
                  <Action
                    onAction={() => {
                      push(
                        <AuthContext.Provider value={{ token, setToken }}>
                          <Tasks organizationId={organization.id} />
                        </AuthContext.Provider>
                      );
                    }}
                    title="Choose Workspace"
                    icon={Icon.ArrowRight}
                  />
                </ActionPanel>
              }
              key={organization.id}
              title={organization.name}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
