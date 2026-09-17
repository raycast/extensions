import { Clipboard, Icon, LaunchType, MenuBarExtra, launchCommand, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ContainerError, errorMessage, listContainers, runContainerMutation, startService } from "./lib/container";
import { toContainerVM } from "./lib/types";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => listContainers(false), [], { initialData: [] });
  const containers = (data ?? []).map(toContainerVM);
  const serviceDown = error instanceof ContainerError && error.kind === "service-down";

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    try {
      await action();
      revalidate();
      await showHUD(successMessage);
    } catch (failure) {
      await showHUD(`⚠️ ${errorMessage(failure)}`);
    }
  };

  return (
    <MenuBarExtra
      icon={Icon.Box}
      title={serviceDown || error ? undefined : String(containers.length)}
      isLoading={isLoading}
      tooltip="Apple Container"
    >
      {serviceDown ? (
        <MenuBarExtra.Item
          title="Service Not Running — Start"
          icon={Icon.Play}
          onAction={() => runAction(startService, "Container service started")}
        />
      ) : error ? (
        <MenuBarExtra.Item
          title="Container Unavailable — Open Manage Containers"
          icon={Icon.Warning}
          onAction={() => launchCommand({ name: "containers", type: LaunchType.UserInitiated })}
        />
      ) : (
        <>
          <MenuBarExtra.Section title="Running Containers">
            {containers.length === 0 ? (
              <MenuBarExtra.Item title="No running containers" />
            ) : (
              containers.map((container) => (
                <MenuBarExtra.Submenu key={container.id} title={container.id} icon={Icon.Box}>
                  <MenuBarExtra.Item title={`Image: ${container.imageShort}`} />
                  {container.ip ? (
                    <MenuBarExtra.Item
                      title={`IP: ${container.ip}`}
                      icon={Icon.CopyClipboard}
                      onAction={() => Clipboard.copy(container.ip ?? "")}
                    />
                  ) : null}
                  <MenuBarExtra.Item
                    title="Stop"
                    icon={Icon.Stop}
                    onAction={() =>
                      runAction(() => runContainerMutation(["stop", container.id]), `Stopped ${container.id}`)
                    }
                  />
                </MenuBarExtra.Submenu>
              ))
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Manage Containers"
              icon={Icon.AppWindowList}
              onAction={() => launchCommand({ name: "containers", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
