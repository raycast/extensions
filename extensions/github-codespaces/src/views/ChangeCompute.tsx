import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { personalAccessToken } from "../preferences";
import { Codespace, Machines } from "../types";
import handleChangeCompute from "../methods/handleChangeCompute";

const ChangeCompute = ({
  codespace,
  onRevalidate,
}: {
  codespace: Codespace;
  onRevalidate: () => void;
}) => {
  const { pop } = useNavigation();
  const { data, isLoading } = useFetch<Machines>(
    `${codespace.repository.url}/codespaces/machines`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${personalAccessToken}`,
      },
    }
  );

  return (
    <List isLoading={isLoading}>
      <List.Section title="Select compute">
        {data?.machines.map((machine) => (
          <List.Item
            key={machine.name}
            title={`${machine.cpus}-core`}
            subtitle={machine.display_name}
            accessories={
              machine.prebuild_availability && [
                {
                  text: "Prebuild available",
                  icon: {
                    source: Icon.Dot,
                    tintColor: "green",
                  },
                },
              ]
            }
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() =>
                    handleChangeCompute({ codespace, machine }).finally(() => {
                      pop();
                      onRevalidate();
                    })
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
};

export default ChangeCompute;
