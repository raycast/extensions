import { Action, ActionPanel, Icon, useNavigation } from "@raycast/api";
import { getFavoriteNamespaces, getUserToken, getVaultNamespace, getVaultUrl, setVaultNamespace } from "../utils";
import { VaultNamespace } from "./namespace";
import { VaultTree } from "./tree";
import { VaultEntities } from "./entities";
import { VaultFavorites } from "./favorites";
import { ReactNode } from "react";

export function setNamespaceAndGoToTree(values: { namespace: string }, push: (component: ReactNode) => void) {
  setVaultNamespace(values.namespace);
  push(<VaultTree path={"/"} />);
}

export function Configuration() {
  const { push } = useNavigation();

  return (
    <>
      {getFavoriteNamespaces().length > 0 && (
        <ActionPanel.Section title="Favorite namespaces">
          {getFavoriteNamespaces()
            .filter((namespace) => namespace !== getVaultNamespace())
            .map((namespace) => (
              <Action
                key={namespace}
                icon={Icon.Book}
                title={`Switch to ${namespace}`}
                onAction={() => setNamespaceAndGoToTree({ namespace }, push)}
              />
            ))}
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Configuration">
        <Action.Push
          icon={Icon.Cog}
          title={"Change namespace"}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          target={<VaultNamespace />}
        />
        <Action.Push
          icon={Icon.Star}
          title={"List favorites"}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          target={<VaultFavorites />}
        />
        <Action.Push
          icon={Icon.PersonLines}
          title={"List entities"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
          target={<VaultEntities />}
        />
        <Action.Push
          icon={Icon.List}
          title={"List secrets"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
          target={<VaultTree path={"/"} />}
        />
      </ActionPanel.Section>
    </>
  );
}

export function Reload(props: { revalidate: () => Promise<void> }) {
  const { revalidate } = props;
  return (
    <ActionPanel.Section title="Reload">
      <Action
        icon={Icon.RotateClockwise}
        title={"Reload"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </ActionPanel.Section>
  );
}

export function CopyToken() {
  return (
    <Action.CopyToClipboard
      icon={Icon.CopyClipboard}
      title="Copy token"
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      content={getUserToken()}
    />
  );
}

export function OpenVault(props: { path?: string }) {
  let path = "";
  if (props.path) {
    path += "/secret";
    if (props.path.endsWith("/")) {
      path += "/list";
    } else {
      path += "/show";
    }
    path += "/" + props.path;
  }
  return (
    <Action.OpenInBrowser
      icon={Icon.Globe}
      title="Open in vault UI"
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      url={`${getVaultUrl()}/ui/vault/secrets${path}?namespace=${getVaultNamespace()}`}
    />
  );
}

export function Root() {
  return (
    <Action.Push
      icon={Icon.ArrowLeft}
      title="Go to root"
      shortcut={{ modifiers: ["opt", "shift"], key: "arrowLeft" }}
      target={<VaultTree path={"/"} />}
    />
  );
}

export function Back(props: { path: string }) {
  const path = props.path.endsWith("/") ? props.path.substring(0, props.path.length - 1) : props.path;
  return (
    <Action.Push
      title={"Go back"}
      icon={Icon.ArrowLeft}
      shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
      target={<VaultTree path={path.substring(0, path.lastIndexOf("/") + 1)} />}
    />
  );
}
