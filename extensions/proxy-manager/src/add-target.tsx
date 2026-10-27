import { LaunchProps, popToRoot } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { TargetForm } from "./components/target-form";
import { preferredHost } from "./lib/context";
import { hostFromInput } from "./lib/host";

/**
 * Exists as its own command for deeplinks, hotkeys and `?arguments=` — the
 * dashboard pushes the same form, so there is only one implementation.
 */
export default function AddTarget(props: LaunchProps<{ arguments: { host?: string } }>) {
  const { data: prefill } = usePromise(() => preferredHost(props.arguments.host), []);

  return (
    <TargetForm
      initialPattern={hostFromInput(props.arguments.host) ?? undefined}
      prefill={prefill ?? undefined}
      onSaved={() => {
        popToRoot({ clearSearchBar: true });
      }}
    />
  );
}
