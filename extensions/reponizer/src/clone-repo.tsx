import { Action, ActionPanel, Clipboard, Form, Icon, LaunchProps, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { readCachedIndex, reconcilePath } from "./lib/cache";
import { getConfig } from "./lib/config";
import { cloneRepo, planClone } from "./lib/ops";
import { protocolOf } from "./lib/remotes";
import type { Protocol } from "./lib/types";
import { errorMessage } from "./lib/util";

type ProtocolChoice = "as-pasted" | Protocol;

export default function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const config = getConfig();
  const [url, setUrl] = useState(props.arguments?.url ?? props.fallbackText ?? "");
  const [choice, setChoice] = useState<ProtocolChoice>("as-pasted");
  const [isCloning, setIsCloning] = useState(false);
  const [urlError, setUrlError] = useState<string>();

  useEffect(() => {
    if (url) return;
    Clipboard.readText().then((text) => {
      if (text && planClone(config.root, text, config.defaultProtocol)) {
        // The user may have started typing while the clipboard read was in flight.
        setUrl((current) => current || text.trim());
      }
    });
    // Only prefill once on mount.
  }, []);

  const plan = useMemo(
    () => planClone(config.root, url, config.defaultProtocol, choice === "as-pasted" ? undefined : choice),
    [config.root, config.defaultProtocol, url, choice],
  );

  const submit = async () => {
    if (!plan) {
      setUrlError("Enter a git URL or a bare path like github.com/owner/repo.");
      return;
    }
    setIsCloning(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Cloning ${plan.relativePath}…` });
    try {
      await cloneRepo(plan);
      const index = readCachedIndex(config.root);
      if (index) await reconcilePath(index, plan.destination, config.defaultProtocol);
      toast.style = Toast.Style.Success;
      toast.title = "Cloned";
      toast.message = plan.relativePath;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Clone failed";
      toast.message = errorMessage(error);
    } finally {
      setIsCloning(false);
    }
  };

  const effectiveProtocol = plan ? (protocolOf(plan.url) ?? "?") : undefined;

  return (
    <Form
      isLoading={isCloning}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Repository URL"
        placeholder="git@github.com:owner/repo.git — or github.com/owner/repo"
        value={url}
        error={urlError}
        onChange={(value) => {
          setUrl(value);
          setUrlError(undefined);
        }}
        autoFocus
      />
      <Form.Dropdown
        id="protocol"
        title="Protocol"
        value={choice}
        onChange={(value) => setChoice(value as ProtocolChoice)}
        info="Bare paths without a protocol use the default protocol from the preferences."
      >
        <Form.Dropdown.Item value="as-pasted" title="As Entered" />
        <Form.Dropdown.Item value="ssh" title="SSH" />
        <Form.Dropdown.Item value="https" title="HTTPS" />
      </Form.Dropdown>
      <Form.Description
        title="Destination"
        text={plan ? `${plan.relativePath}\nvia ${effectiveProtocol}: ${plan.url}` : "—"}
      />
    </Form>
  );
}
