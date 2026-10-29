import { Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useAudit } from "./components/use-audit";
import { unreviewed } from "./lib/model";
import { browserFromProfileKey } from "./lib/browsers/registry";

export default function Command() {
  const audit = useAudit(true);
  const events = unreviewed(audit.state.events);
  const incomplete = !!audit.error || audit.state.diagnostics.length > 0;
  const initialized = Object.keys(audit.state.baselines).length > 0;
  const groups = [...new Set(events.map((e) => e.extensionKey))];
  const open = (extensionKey?: string) =>
    launchCommand({
      name: "browser-extensions",
      type: LaunchType.UserInitiated,
      context: extensionKey ? { extensionKey } : undefined,
    });
  return (
    <MenuBarExtra
      isLoading={audit.loading}
      icon={incomplete ? Icon.Warning : initialized ? Icon.Shield : Icon.Gear}
      title={events.length ? String(events.length) : undefined}
      tooltip={
        incomplete
          ? "Extension audit: scan incomplete"
          : initialized
            ? `${events.length} unreviewed extension changes`
            : "Extension audit: setup required"
      }
    >
      <MenuBarExtra.Item title={`${events.length} Unreviewed Actionable Changes`} />
      <MenuBarExtra.Item
        title={`Last Scan: ${audit.state.lastAttempt ? new Date(audit.state.lastAttempt).toLocaleString() : "Not yet attempted"}`}
      />
      <MenuBarExtra.Item
        title={`Last Complete Scan: ${audit.state.lastSuccess ? new Date(audit.state.lastSuccess).toLocaleString() : "Not yet completed"}`}
      />
      {incomplete && (
        <MenuBarExtra.Item
          title="Scan incomplete — previous observations retained"
          icon={Icon.Warning}
          onAction={() => open()}
        />
      )}
      {!initialized && <MenuBarExtra.Item title="Set Up Baseline" onAction={() => open()} />}
      <MenuBarExtra.Section>
        {groups.slice(0, 30).map((key) => {
          const changes = events.filter((e) => e.extensionKey === key);
          return (
            <MenuBarExtra.Submenu
              key={key}
              title={`${changes[0].extensionName} · ${browserFromProfileKey(changes[0].profileKey)} · ${changes[0].profileName}`}
              icon={Icon.Box}
            >
              {changes.map((event) => (
                <MenuBarExtra.Item key={event.id} title={event.title} onAction={() => open(key)} />
              ))}
              <MenuBarExtra.Item
                title="Mark These Changes as Reviewed"
                icon={Icon.CheckCircle}
                onAction={() => audit.review(changes.map((e) => e.id))}
              />
            </MenuBarExtra.Submenu>
          );
        })}
        {groups.length > 30 && (
          <MenuBarExtra.Item title="View All Changes in Browser Extensions" onAction={() => open()} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Browser Extensions" icon={Icon.List} onAction={() => open()} />
        <MenuBarExtra.Item title="Scan Now" icon={Icon.ArrowClockwise} onAction={audit.refresh} />
        {events.length > 0 && (
          <MenuBarExtra.Item
            title="Mark Changes as Reviewed"
            icon={Icon.CheckCircle}
            onAction={() => audit.review(events.map((e) => e.id))}
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
