import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import { Color, Icon, List } from "@raycast/api";
import { GetProblemDuration } from "@ui/components/accessory";

function MetadataProblems({
  value,
}: {
  value: Types.DataProblemsView;
}): React.JSX.Element {
  /* Context */
  const ctxSelectedServer = React.useContext(ContextGlobal.SelectedServer);

  /* Metadata: Zabbix Server Name */
  const metaServerName = React.useMemo(() => {
    const uuid = ctxSelectedServer.value;
    if (uuid && uuid.toLowerCase() === "all")
      return (
        <List.Item.Detail.Metadata.Label
          title="Server"
          text={value.server_name}
        />
      );
  }, [ctxSelectedServer.value]);

  /* Metadata: Host Name */
  const metaHostName = React.useMemo(() => {
    const name = value.hosts?.at(0)?.name;
    if (name)
      return <List.Item.Detail.Metadata.Label title="Host Name" text={name} />;
  }, [value.hosts]);

  /* Metadata: Host Name */
  const metaHostDescription = React.useMemo(() => {
    const description = value.hosts?.at(0)?.description;
    if (description)
      return (
        <List.Item.Detail.Metadata.Label
          title="Host Description"
          text={description}
        />
      );
  }, [value.hosts]);

  /* Metadata: Problem Name */
  const metaProblemName = React.useMemo(() => {
    const name = value.lastEvent?.name;
    if (name)
      return <List.Item.Detail.Metadata.Label title="Problem" text={name} />;
  }, [value.lastEvent?.name]);

  /* Metadata: Severity */
  const metaSeverity = React.useMemo(() => {
    if (!value.lastEvent?.severity) return;
    const severityRecord: Record<number, React.JSX.Element> = {
      0: (
        <List.Item.Detail.Metadata.TagList.Item
          color={{ light: "#97AAB3", dark: "#97AAB3" }}
          icon={Icon.Info}
          text="Not Classified"
          key={0}
        />
      ),
      1: (
        <List.Item.Detail.Metadata.TagList.Item
          color={{ light: "#7499FF", dark: "#7499FF" }}
          icon={Icon.Info}
          text="Information"
          key={1}
        />
      ),
      2: (
        <List.Item.Detail.Metadata.TagList.Item
          color={{ light: "#FFC859", dark: "#FFC859" }}
          icon={Icon.Warning}
          text="Warning"
          key={2}
        />
      ),
      3: (
        <List.Item.Detail.Metadata.TagList.Item
          color={{ light: "#FFA059", dark: "#FFA059" }}
          icon={Icon.Warning}
          text="Average"
          key={3}
        />
      ),
      4: (
        <List.Item.Detail.Metadata.TagList.Item
          color={{ light: "#E9765A", dark: "#E9765A" }}
          icon={Icon.XMarkCircle}
          text="High"
          key={4}
        />
      ),
      5: (
        <List.Item.Detail.Metadata.TagList.Item
          color={{ light: "#E45959", dark: "#E45959" }}
          icon={Icon.XMarkCircle}
          text="Disaster"
          key={5}
        />
      ),
    };
    const severity = severityRecord[value.lastEvent.severity];
    if (severity)
      return (
        <List.Item.Detail.Metadata.TagList title="Severity">
          {severity}
        </List.Item.Detail.Metadata.TagList>
      );
  }, [value.lastEvent?.severity]);

  /* Metadata: Time & Duration */
  const metaTime = React.useMemo(() => {
    if (!value.lastEvent?.clock) return;
    return (
      <React.Fragment>
        <List.Item.Detail.Metadata.Label
          title="Last Change"
          text={new Date(value.lastEvent.clock * 1000).toLocaleString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Duration"
          text={GetProblemDuration(value.lastEvent.clock)}
        />
      </React.Fragment>
    );
  }, [value.lastEvent?.clock]);

  const metaAck = React.useMemo(() => {
    if (!value.lastEvent?.acknowledged || value.lastEvent.acknowledged === "0")
      return;
    return (
      <List.Item.Detail.Metadata.TagList title="Acknowledged">
        <List.Item.Detail.Metadata.TagList.Item
          text="True"
          icon={Icon.ThumbsUp}
          color={Color.Green}
          key={0}
        />
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.lastEvent?.acknowledged]);

  const metaTags = React.useMemo(() => {
    if (!value.event_get_result?.tags?.length) return;
    return (
      <List.Item.Detail.Metadata.TagList title="Tags">
        {value.event_get_result.tags.map((v, i) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={i}
            text={`${v.tag}: ${v.value}`}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.event_get_result?.tags]);

  const metaItems = React.useMemo(() => {
    if (!value.items?.length) return;

    return (
      <React.Fragment>
        <List.Item.Detail.Metadata.Separator />
        {value.items.map((v, i) =>
          v.name_resolved && v.lastvalue && v.units ? (
            <List.Item.Detail.Metadata.Label
              title={`Item: ${v.name_resolved}`}
              text={`${v.lastvalue}${v.units}`}
              key={i}
            />
          ) : undefined,
        )}
      </React.Fragment>
    );
  }, [value.items]);

  const metaMessages = React.useMemo(() => {
    if (!value.event_get_result?.acknowledges?.length) return;
    return (
      <React.Fragment>
        <List.Item.Detail.Metadata.Separator />
        {value.event_get_result.acknowledges.map((v, i) => (
          <List.Item.Detail.Metadata.Label
            icon={Icon.SpeechBubble}
            title={v.username}
            text={v.message}
            key={i}
          />
        ))}
      </React.Fragment>
    );
  }, [value.event_get_result?.acknowledges]);

  return (
    <List.Item.Detail.Metadata>
      {metaServerName}
      {metaHostName}
      {metaHostDescription}
      {metaProblemName}
      {metaSeverity}
      {metaTime}
      {metaAck}
      {metaTags}
      {metaItems}
      {metaMessages}
    </List.Item.Detail.Metadata>
  );
}

export function DetailProblems({
  value,
}: {
  value: Types.DataProblemsView;
}): React.ReactNode {
  return <List.Item.Detail metadata={<MetadataProblems value={value} />} />;
}
