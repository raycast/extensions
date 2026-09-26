import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  AsyncTimeUnit,
  buildSchedulerCode,
  SchedulerBuilderInput,
  SchedulerScope,
  SchedulerTiming,
} from "./lib/scheduler-builder";

function CodePreview({ code }: { code: string }) {
  return (
    <Detail
      navigationTitle="Scheduler Code"
      markdown={`\`\`\`java\n${code}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Java Code" content={code} />
        </ActionPanel>
      }
    />
  );
}

export default function SchedulerCodeBuilder() {
  const { push } = useNavigation();
  const [scope, setScope] = useState<SchedulerScope>("global");
  const [timing, setTiming] = useState<SchedulerTiming>("now");
  const [withRetiredCallback, setWithRetiredCallback] = useState(false);

  function values(form: Partial<SchedulerBuilderInput>): SchedulerBuilderInput {
    return {
      scope,
      timing,
      pluginVariable: form.pluginVariable ?? "plugin",
      locationVariable: form.locationVariable ?? "location",
      entityVariable: form.entityVariable ?? "entity",
      delay: form.delay ?? "20L",
      period: form.period ?? "20L",
      asyncUnit: (form.asyncUnit as AsyncTimeUnit) ?? "SECONDS",
      withRetiredCallback,
    };
  }

  async function copy(form: Partial<SchedulerBuilderInput>) {
    const code = buildSchedulerCode(values(form));
    await Clipboard.copy(code);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied scheduler code",
    });
  }

  return (
    <Form
      navigationTitle="Scheduler Code Builder"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Java Code"
            icon={Icon.Clipboard}
            onSubmit={copy}
          />
          <Action.SubmitForm
            title="Show Code"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            onSubmit={(form: Partial<SchedulerBuilderInput>) =>
              push(<CodePreview code={buildSchedulerCode(values(form))} />)
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Pick what the task touches and Folia's real API for it — GlobalRegionScheduler, RegionScheduler, EntityScheduler or AsyncScheduler — with the exact method for the timing you need." />
      <Form.Dropdown
        id="scope"
        title="Scope"
        value={scope}
        onChange={(value) => setScope(value as SchedulerScope)}
      >
        <Form.Dropdown.Item
          value="global"
          title="Global Region"
          icon={Icon.Globe}
        />
        <Form.Dropdown.Item
          value="region"
          title="Location / Block"
          icon={Icon.Pin}
        />
        <Form.Dropdown.Item
          value="entity"
          title="Entity / Player"
          icon={Icon.Person}
        />
        <Form.Dropdown.Item
          value="async"
          title="Async (Database / Web)"
          icon={Icon.Network}
        />
      </Form.Dropdown>
      <Form.Dropdown
        id="timing"
        title="Timing"
        value={timing}
        onChange={(value) => setTiming(value as SchedulerTiming)}
      >
        <Form.Dropdown.Item value="now" title="Now (Once)" />
        <Form.Dropdown.Item value="delayed" title="Delayed" />
        <Form.Dropdown.Item value="fixedRate" title="Fixed Rate (Periodic)" />
      </Form.Dropdown>

      {scope === "async" ? (
        <Form.Dropdown id="asyncUnit" title="Time Unit" defaultValue="SECONDS">
          <Form.Dropdown.Item value="MILLISECONDS" title="Milliseconds" />
          <Form.Dropdown.Item value="SECONDS" title="Seconds" />
          <Form.Dropdown.Item value="MINUTES" title="Minutes" />
        </Form.Dropdown>
      ) : (
        <Form.Description text="Delay and period below are in ticks (20 ticks = 1 second) — only AsyncScheduler takes a real-time unit." />
      )}

      {timing !== "now" && (
        <Form.TextField
          id="delay"
          title={scope === "async" ? "Delay" : "Delay (Ticks)"}
          placeholder={scope === "async" ? "1" : "20L"}
        />
      )}
      {timing === "fixedRate" && (
        <Form.TextField
          id="period"
          title={scope === "async" ? "Period" : "Period (Ticks)"}
          placeholder={scope === "async" ? "30" : "20L"}
        />
      )}

      {scope === "region" && (
        <Form.TextField
          id="locationVariable"
          title="Location Variable"
          placeholder="location"
          info="The RegionScheduler also has a World + chunk-coordinate overload; this builder uses the Location one."
        />
      )}
      {scope === "entity" && (
        <>
          <Form.TextField
            id="entityVariable"
            title="Entity Variable"
            placeholder="entity"
          />
          <Form.Checkbox
            id="withRetiredCallback"
            label="Add retired callback (runs if the entity is gone before the task fires)"
            value={withRetiredCallback}
            onChange={setWithRetiredCallback}
          />
        </>
      )}
      <Form.TextField
        id="pluginVariable"
        title="Plugin Variable"
        placeholder="plugin"
      />
    </Form>
  );
}
