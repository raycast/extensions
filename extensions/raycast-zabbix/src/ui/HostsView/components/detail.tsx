import * as React from "react";
import * as Types from "@ui/types";
import * as ContextGlobal from "@ui/context";
import { Color, Icon, List } from "@raycast/api";

function getTagSeverity(
  severity: number,
  value: string,
): React.JSX.Element | undefined {
  const tag = [
    <List.Item.Detail.Metadata.TagList.Item
      color={{ light: "#97AAB3", dark: "#97AAB3" }}
      icon={Icon.Info}
      text={`Not Classified: ${value}`}
      key={0}
    />,
    <List.Item.Detail.Metadata.TagList.Item
      color={{ light: "#7499FF", dark: "#7499FF" }}
      icon={Icon.Info}
      text={`Information: ${value}`}
      key={1}
    />,
    <List.Item.Detail.Metadata.TagList.Item
      color={{ light: "#FFC859", dark: "#FFC859" }}
      icon={Icon.Warning}
      text={`Warning: ${value}`}
      key={2}
    />,
    <List.Item.Detail.Metadata.TagList.Item
      color={{ light: "#FFA059", dark: "#FFA059" }}
      icon={Icon.Warning}
      text={`Average: ${value}`}
      key={3}
    />,
    <List.Item.Detail.Metadata.TagList.Item
      color={{ light: "#E9765A", dark: "#E9765A" }}
      icon={Icon.XMarkCircle}
      text={`High: ${value}`}
      key={4}
    />,
    <List.Item.Detail.Metadata.TagList.Item
      color={{ light: "#E45959", dark: "#E45959" }}
      icon={Icon.XMarkCircle}
      text={`Disaster: ${value}`}
      key={5}
    />,
  ];
  return tag.at(severity);
}

function MetadataHosts({
  value,
}: {
  value: Types.DataHostsView;
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

  const metaHostName = React.useMemo(() => {
    const name = value.name;
    if (name)
      return <List.Item.Detail.Metadata.Label title="Host Name" text={name} />;
  }, [value.name]);

  const metaHostDescription = React.useMemo(() => {
    const description = value.description;
    if (description)
      return (
        <List.Item.Detail.Metadata.Label
          title="Host Description"
          text={description}
        />
      );
  }, [value.description]);

  const metaGroups = React.useMemo(() => {
    if (!value.hostgroups?.length) return;

    return (
      <List.Item.Detail.Metadata.TagList title="Groups">
        {value.hostgroups.map((v, k) => (
          <List.Item.Detail.Metadata.TagList.Item key={k} text={v.name} />
        ))}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.hostgroups]);

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

  const metaStatus = React.useMemo(() => {
    if (!value.status) return;

    const tags = [
      <List.Item.Detail.Metadata.TagList.Item
        text={value.status === "0" ? "Enabled" : "Disabled"}
        icon={value.status === "0" ? Icon.Checkmark : Icon.CircleDisabled}
        color={value.status === "0" ? Color.Green : Color.SecondaryText}
        key={0}
      />,
    ];

    if (value.maintenance_status === "1")
      tags.push(
        <List.Item.Detail.Metadata.TagList.Item
          text="In Maintenance"
          icon={Icon.WrenchScrewdriver}
          color={Color.Orange}
          key={tags.length}
        />,
      );

    return (
      <List.Item.Detail.Metadata.TagList title="Status">
        {tags}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.status, value.maintenance_status]);

  const metaTriggerBySeverity = React.useMemo(() => {
    if (!value.triggers?.length) return;

    const problems: React.JSX.Element[] = [];
    const problemsCounter: number[] = [0, 0, 0, 0, 0, 0];

    /* Count Problems by Severity */
    for (const trigger of value.triggers) {
      if (!trigger.status || !trigger.value || !trigger.priority) continue;

      /* Count only if Trigger is enabled and in Problem status */
      if (trigger.status === "0" && trigger.value === "1")
        problemsCounter[Number(trigger.priority)] += 1;
    }

    /* Push Accessory */
    for (const [severity, counter] of problemsCounter.entries()) {
      if (counter === 0) continue;
      const a = getTagSeverity(severity, String(counter));
      if (a) problems.push(a);
    }

    return (
      <List.Item.Detail.Metadata.TagList title="Problems">
        {problems}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.triggers]);

  const metaInterfaces = React.useMemo(() => {
    if (!value.interfaces?.length) return;

    const type: string[] = ["Agent", "SNMP", "IPMI", "JMX"];
    const colors = [Color.SecondaryText, Color.Green, Color.Red];
    const icons = [Icon.QuestionMark, Icon.Plug, Icon.CircleDisabled];

    const interfaces: React.JSX.Element[] = [];
    for (const [key, i] of value.interfaces.entries()) {
      if (!i.type || Number(i.type) > 4 || Number(i.type) < 1 || !i.available)
        continue;

      /* Value: Type */
      let text = type.at(Number(i.type) - 1);
      if (i.useip === "0" && i.dns) text += `: ${i.dns}`;
      if (i.useip === "1" && i.ip) text += `: ${i.ip}`;
      if (i.port && i.port !== "") text += `:${i.port}`;

      /* Color, Icon: Availability */
      const color = colors.at(Number(i.available));
      const icon = icons.at(Number(i.available));

      /* Push Accessory */
      interfaces.push(
        <List.Item.Detail.Metadata.TagList.Item
          icon={icon}
          color={color}
          text={text}
          key={key}
        />,
      );
    }

    return (
      <List.Item.Detail.Metadata.TagList title="Interfaces">
        {interfaces}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.interfaces]);

  const metaInterfacesError = React.useMemo(() => {
    if (!value.interfaces?.length) return;

    const intWithError = value.interfaces.filter(
      (v) => v.error && v.error !== "",
    );
    if (!intWithError.length) return;

    const type: string[] = ["Agent", "SNMP", "IPMI", "JMX"];

    return intWithError.map((v) => (
      <List.Item.Detail.Metadata.Label
        title={`Interface "${type.at(Number(v.type) - 1)}" Error`}
        text={v.error}
        key={0}
      />
    ));
  }, [value.interfaces]);

  return (
    <List.Item.Detail.Metadata>
      {metaServerName}
      {metaHostName}
      {metaHostDescription}
      {metaGroups}
      {metaTags}
      {metaStatus}
      {metaTriggerBySeverity}
      {metaInterfaces}
      {metaInterfacesError}
    </List.Item.Detail.Metadata>
  );
}

export function DetailHosts({
  value,
}: {
  value: Types.DataHostsView;
}): React.ReactNode {
  return <List.Item.Detail metadata={<MetadataHosts value={value} />} />;
}
