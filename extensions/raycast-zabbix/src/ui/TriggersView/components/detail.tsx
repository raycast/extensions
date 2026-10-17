import * as React from "react";
import * as Types from "@ui/types";
import { Color, Icon, List } from "@raycast/api";

const SeverityTag: Record<number, React.JSX.Element> = {
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

function MetadataTriggers({
  value,
  showHostMeta,
}: {
  value: Types.DataTriggersView;
  showHostMeta: boolean;
}): React.JSX.Element {
  const metaHostName = React.useMemo(() => {
    if (!showHostMeta || !value.hosts?.length) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Host Name"
        text={value.hosts.at(0)?.name}
      />
    );
  }, [showHostMeta, value.hosts]);

  const metaHostDescription = React.useMemo(() => {
    if (!showHostMeta || !value.hosts?.length) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Host Description"
        text={value.hosts.at(0)?.description}
      />
    );
  }, [showHostMeta, value.hosts]);

  const metaTriggerDesc = React.useMemo(() => {
    if (!value.description) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Trigger"
        text={value.description}
      />
    );
  }, [value.description]);

  const metaExpression = React.useMemo(() => {
    if (!value.expression) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Expression"
        text={value.expression}
      />
    );
  }, [value.expression]);

  const metaSeverity = React.useMemo(() => {
    if (!value.priority) return;
    const sev = SeverityTag[Number(value.priority)];
    if (!sev) return;
    return (
      <List.Item.Detail.Metadata.TagList title="Severity">
        {sev}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.priority]);

  const metaStatus = React.useMemo(() => {
    if (!value.status) return;
    return (
      <List.Item.Detail.Metadata.TagList title="Status">
        <List.Item.Detail.Metadata.TagList.Item
          text={value.status === "0" ? "Enabled" : "Disabled"}
          icon={value.status === "0" ? Icon.Checkmark : Icon.CircleDisabled}
          color={value.status === "0" ? Color.Green : Color.SecondaryText}
          key={0}
        />
        {value.state === "1" && (
          <List.Item.Detail.Metadata.TagList.Item
            text="Unknown"
            icon={Icon.XMarkCircle}
            color={Color.Red}
            key={1}
          />
        )}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.status, value.state]);

  const metaValue = React.useMemo(() => {
    if (!value.value) return;
    return (
      <List.Item.Detail.Metadata.TagList title="Value">
        <List.Item.Detail.Metadata.TagList.Item
          text={value.value === "0" ? "OK" : "PROBLEM"}
          icon={value.value === "0" ? Icon.Checkmark : Icon.XMarkCircle}
          color={value.value === "0" ? Color.Green : Color.Red}
          key={0}
        />
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.value]);

  const metaLastChange = React.useMemo(() => {
    if (!value.lastchange) return;
    const ts = Number(value.lastchange);
    const date = new Date(ts * 1000);
    return (
      <List.Item.Detail.Metadata.Label
        title="Last Change"
        text={date.toLocaleString()}
      />
    );
  }, [value.lastchange]);

  const metaComments = React.useMemo(() => {
    if (!value.comments) return;
    return (
      <List.Item.Detail.Metadata.Label title="Comments" text={value.comments} />
    );
  }, [value.comments]);

  const metaError = React.useMemo(() => {
    if (!value.error) return;
    return <List.Item.Detail.Metadata.Label title="Error" text={value.error} />;
  }, [value.error]);

  const metaTags = React.useMemo(() => {
    if (!value.tags?.length) return;
    return (
      <List.Item.Detail.Metadata.TagList title="Tags">
        {value.tags.map((v, k) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={k}
            text={`${v.tag}: ${v.value}`}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.tags]);

  const metaItems = React.useMemo(() => {
    if (!value.items?.length) return;
    return (
      <React.Fragment>
        <List.Item.Detail.Metadata.Separator />
        {value.items.map((v, i) =>
          v.name_resolved ? (
            <List.Item.Detail.Metadata.Label
              title={`Item: ${v.name_resolved}`}
              text={`${v.lastvalue ?? ""}${v.units ?? ""}`.trim()}
              key={i}
            />
          ) : undefined,
        )}
      </React.Fragment>
    );
  }, [value.items]);

  const metaLastEvent = React.useMemo(() => {
    if (!value.lastEvent) return;

    const name =
      value.lastEvent.name && value.lastEvent.name.trim() !== ""
        ? value.lastEvent.name
        : undefined;

    const clock = value.lastEvent.clock
      ? new Date(Number(value.lastEvent.clock) * 1000).toLocaleString()
      : undefined;

    if (!name && !clock) return;

    return (
      <React.Fragment>
        <List.Item.Detail.Metadata.Separator />
        {name && (
          <List.Item.Detail.Metadata.Label title="Last Event" text={name} />
        )}
        {clock && (
          <List.Item.Detail.Metadata.Label
            title="Last Event Time"
            text={clock}
          />
        )}
      </React.Fragment>
    );
  }, [value.lastEvent]);

  return (
    <List.Item.Detail.Metadata>
      {metaHostName}
      {metaHostDescription}
      {metaTriggerDesc}
      {metaExpression}
      {metaSeverity}
      {metaStatus}
      {metaValue}
      {metaLastChange}
      {metaComments}
      {metaError}
      {metaTags}
      {metaItems}
      {metaLastEvent}
    </List.Item.Detail.Metadata>
  );
}

export function DetailTriggers({
  value,
  showHostMeta,
}: {
  value: Types.DataTriggersView;
  showHostMeta: boolean;
}): React.JSX.Element {
  return (
    <List.Item.Detail
      metadata={<MetadataTriggers value={value} showHostMeta={showHostMeta} />}
    />
  );
}
