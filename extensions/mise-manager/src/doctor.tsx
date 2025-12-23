import { Action, ActionPanel, Detail, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatMiseError, runDoctor, MiseDoctorResult } from "./tools/mise";

export default function DoctorCommand() {
  const { data, isLoading, error, revalidate } = usePromise(runDoctor, []);

  const markdown = error ? `\`\`\`text\n${formatMiseError(error)}\n\`\`\`` : "Loading…";

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading mise doctor report..." />;
  }

  if (error) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Run Doctor Again" icon={Icon.Repeat} onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) {
    return (
      <Detail
        markdown="No doctor data available."
        actions={
          <ActionPanel>
            <Action title="Run Doctor Again" icon={Icon.Repeat} onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      metadata={<DoctorMetadata data={data} />}
      actions={
        <ActionPanel>
          <Action title="Run Doctor Again" icon={Icon.Repeat} onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}

function DoctorMetadata({ data }: { data: MiseDoctorResult }) {
  const booleanIcon = (value: boolean) =>
    value ? { source: Icon.CheckCircle, tintColor: Color.Green } : { source: Icon.XMarkCircle, tintColor: Color.Red };
  const booleanText = (value: boolean) => (value ? "Yes" : "No");

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="mise Version"
        text={data.version}
        icon={booleanIcon(data.self_update_available).source} // Use icon from self_update_available
        tooltip={data.self_update_available ? "Update Available" : "Up to Date"}
      />
      {data.build_info ? (
        <>
          <Detail.Metadata.Label title="Target" text={data.build_info.target} icon={Icon.Desktop} />
          <Detail.Metadata.Label
            title="Built On"
            text={new Date(data.build_info.built).toLocaleString()}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label title="Rust Version" text={data.build_info.rust_version} icon={Icon.Terminal} />
          <Detail.Metadata.Label title="Features" text={data.build_info.features} icon={Icon.Gear} />
        </>
      ) : null}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Activated" text={booleanText(data.activated)} icon={booleanIcon(data.activated)} />
      <Detail.Metadata.Label
        title="Shims on PATH"
        text={booleanText(data.shims_on_path)}
        icon={booleanIcon(data.shims_on_path)}
      />
      <Detail.Metadata.Label
        title="Self Update Available"
        text={booleanText(data.self_update_available)}
        icon={booleanIcon(data.self_update_available)}
      />
      <Detail.Metadata.Label title="Shell" text={`${data.shell.name} ${data.shell.version}`} icon={Icon.Terminal} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.TagList title="Config Files">
        {data.config_files.length > 0 ? (
          data.config_files.map((file) => <Detail.Metadata.TagList.Item key={file} text={file} icon={Icon.Document} />)
        ) : (
          <Detail.Metadata.TagList.Item text="None" />
        )}
      </Detail.Metadata.TagList>
      {data.ignored_config_files.length > 0 ? (
        <Detail.Metadata.TagList title="Ignored Configs">
          {data.ignored_config_files.map((file) => (
            <Detail.Metadata.TagList.Item key={file} text={file} icon={Icon.Document} />
          ))}
        </Detail.Metadata.TagList>
      ) : null}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Cache Dir" text={data.dirs.cache} icon={Icon.Folder} />
      <Detail.Metadata.Label title="Config Dir" text={data.dirs.config} icon={Icon.Gear} />
      <Detail.Metadata.Label title="Data Dir" text={data.dirs.data} icon={Icon.Folder} />
      <Detail.Metadata.Label title="Shims Dir" text={data.dirs.shims} icon={Icon.Link} />
      <Detail.Metadata.Label title="State Dir" text={data.dirs.state} icon={Icon.Circle} />

      <Detail.Metadata.Separator />

      {Object.keys(data.env_vars).length > 0 && (
        <Detail.Metadata.TagList title="Environment Variables">
          {Object.entries(data.env_vars).map(([key, value]) => (
            <Detail.Metadata.TagList.Item key={key} text={`${key}=${value}`} icon={Icon.Variable} />
          ))}
        </Detail.Metadata.TagList>
      )}

      {data.paths.length > 0 && (
        <Detail.Metadata.TagList title="PATH Entries">
          {data.paths.map((path) => (
            <Detail.Metadata.TagList.Item key={path} text={path} icon={Icon.TwoArrowsBlockToLine} />
          ))}
        </Detail.Metadata.TagList>
      )}

      {Object.keys(data.toolset).length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Toolset (Installed)">
            {Object.entries(data.toolset).map(([tool, versions]) => (
              <Detail.Metadata.TagList.Item
                key={tool}
                text={`${tool}@${versions.map((v) => v.version).join(", ")}`}
                icon={Icon.Box}
              />
            ))}
          </Detail.Metadata.TagList>
        </>
      )}

      {data.aqua && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Aqua Baked-in Tools"
            text={String(data.aqua.baked_in_registry_tools)}
            icon={Icon.Snowflake}
          />
        </>
      )}
    </Detail.Metadata>
  );
}
