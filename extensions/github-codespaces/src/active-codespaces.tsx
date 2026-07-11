import { Icon, MenuBarExtra } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { personalAccessToken, preferredEditor } from "./preferences";
import { clientNames, Codespace, Codespaces } from "./types";
import { launchEditor } from "./utils/launchEditor";

const CommandItem = ({ codespace }: { codespace: Codespace }) => {
  return (
    <MenuBarExtra.Item
      key={codespace.id}
      icon={{
        source: Icon.Dot,
        tintColor: "green",
      }}
      title={`${codespace.display_name || codespace.name} • ${
        codespace.repository.owner.login
      }/${codespace.repository.name}`}
      onAction={() => launchEditor({ codespace })}
      tooltip={`Launch in ${clientNames[preferredEditor]}`}
    />
  );
};

export default function Command() {
  const { data, isLoading } = useFetch<Codespaces>(
    "https://api.github.com/user/codespaces",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${personalAccessToken}`,
      },
    }
  );

  if (!data) {
    return (
      <MenuBarExtra
        icon={{ source: { light: "github.png", dark: "github@dark.png" } }}
        isLoading={true}
      />
    );
  }

  const activeCodespaces = data.codespaces.filter(
    (codespace) => codespace.state === "Available"
  );
  const recentCodespaces = data.codespaces
    .filter((codespace) => codespace.state === "Shutdown")
    .sort(
      (a, b) =>
        new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
    )
    .slice(0, 5);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: { light: "github.png", dark: "github@dark.png" } }}
      title={
        activeCodespaces.length
          ? `${activeCodespaces.length} active`
          : undefined
      }
      tooltip="Active Codespaces"
    >
      <MenuBarExtra.Item
        title={activeCodespaces.length ? "Active" : "No active codespaces"}
      />
      {activeCodespaces.map((codespace) => (
        <CommandItem key={codespace.id} codespace={codespace} />
      ))}
      <MenuBarExtra.Item title="Recent" />
      {recentCodespaces.map((codespace) => (
        <CommandItem key={codespace.id} codespace={codespace} />
      ))}
    </MenuBarExtra>
  );
}
