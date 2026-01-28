import { Action, ActionPanel, Icon, useNavigation, Clipboard, showHUD } from "@raycast/api";
import {
  getFavoriteNamespaces,
  getUserToken,
  getVaultNamespace,
  getVaultUrl,
  setSecretEngine,
  setVaultNamespace,
} from "../utils";
import { VaultNamespace } from "./namespace";
import { VaultTree } from "./tree";
import { VaultEntities } from "./entities";
import { VaultFavorites } from "./favorites";
import { ReactNode } from "react";
import { VaulEngines } from "./engines";

export async function setNamespaceAndGoToTree(
  values: {
    namespace: string;
  },
  push: (component: ReactNode) => void
) {
  await setVaultNamespace(values.namespace);
  push(<VaultTree path={"/"} />);
}

export function setSecretEngineAndGoToTree(secretEngine: string, push: (component: ReactNode) => void) {
  setSecretEngine(secretEngine);
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
          title={"Change Namespace"}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          target={<VaultNamespace />}
        />
        <Action.Push
          icon={Icon.Star}
          title={"List Favorites"}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          target={<VaultFavorites />}
        />
        <Action.Push
          icon={Icon.PersonLines}
          title={"List Entities"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
          target={<VaultEntities />}
        />
        <Action.Push
          icon={Icon.List}
          title={"List Secrets"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
          target={<VaultTree path={"/"} />}
        />
        <Action.Push
          icon={Icon.AppWindow}
          title={"List Engines"}
          shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
          target={<VaulEngines />}
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
    <Action
      icon={Icon.CopyClipboard}
      title="Copy Token"
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      onAction={async () => {
        const token = await getUserToken();
        await Clipboard.copy(token);
        await showHUD("Token copied to clipboard");
      }}
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
      title="Open in Vault UI"
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      url={`${getVaultUrl()}/ui/vault/secrets${path}?namespace=${getVaultNamespace()}`}
    />
  );
}

export function Root() {
  return (
    <Action.Push
      icon={Icon.ArrowLeft}
      title="Go to Root"
      shortcut={{ modifiers: ["opt", "shift"], key: "arrowLeft" }}
      target={<VaultTree path={"/"} />}
    />
  );
}

export function Back(props: { path: string }) {
  const path = props.path.endsWith("/") ? props.path.substring(0, props.path.length - 1) : props.path;
  return (
    <Action.Push
      title={"Go Back"}
      icon={Icon.ArrowLeft}
      shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
      target={<VaultTree path={path.substring(0, path.lastIndexOf("/") + 1)} />}
    />
  );
}
