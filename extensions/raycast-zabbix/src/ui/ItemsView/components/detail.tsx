import * as React from "react";
import * as Types from "@ui/types";
import { Color, Icon, List } from "@raycast/api";
import { GetProblemDuration } from "@ui/components/accessory";

const ItemType: Record<string, string> = {
  "0": "Zabbix agent",
  "2": "Zabbix trapper",
  "3": "Simple check",
  "5": "Zabbix internal",
  "7": "Zabbix agent (active)",
  "9": "Web item",
  "10": "External check",
  "11": "Database monitor",
  "12": "IPMI agent",
  "13": "SSH agent",
  "14": "TELNET agent",
  "15": "Calculated",
  "16": "JMX agent",
  "17": "SNMP trap",
  "18": "Dependent item",
  "19": "HTTP agent",
  "20": "SNMP agent",
  "21": "Script",
  "22": "Browser",
};

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

function MetadataItems({
  value,
  showHostMeta,
}: {
  value: Types.DataItemsView;
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

  const metaItemName = React.useMemo(() => {
    if (!value.name_resolved) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Item"
        text={value.name_resolved}
      />
    );
  }, [value.name_resolved]);

  const metaItemDescription = React.useMemo(() => {
    if (!value.description) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Description"
        text={value.description}
      />
    );
  }, [value.description]);

  const metaItemType = React.useMemo(() => {
    if (!value.type) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Type"
        text={ItemType[value.type] ?? ""}
      />
    );
  }, [value.type]);

  const metaItemHistory = React.useMemo(() => {
    if (!value.history) return;
    return (
      <List.Item.Detail.Metadata.Label title="History" text={value.history} />
    );
  }, [value.history]);

  const metaItemTime = React.useMemo(() => {
    if (!value.lastclock) return;
    return (
      <React.Fragment>
        <List.Item.Detail.Metadata.Label
          title="Last Change"
          text={new Date(Number(value.lastclock) * 1000).toLocaleString()}
        />
        <List.Item.Detail.Metadata.Label
          title="Duration"
          text={GetProblemDuration(Number(value.lastclock))}
        />
      </React.Fragment>
    );
  }, [value.lastclock]);

  const metaItemLastValue = React.useMemo(() => {
    if (!value.lastvalue) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Last Value"
        text={`${value.lastvalue} ${value.units ?? ""}`.trim()}
      />
    );
  }, [value.lastvalue]);

  const metaItemPrevValue = React.useMemo(() => {
    if (!value.prevvalue) return;
    return (
      <List.Item.Detail.Metadata.Label
        title="Prev Value"
        text={`${value.prevvalue} ${value.units ?? ""}`.trim()}
      />
    );
  }, [value.prevvalue]);

  const metaItemTags = React.useMemo(() => {
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

  const metaItemStatus = React.useMemo(() => {
    if (!value.status) return;

    const tags = [
      <List.Item.Detail.Metadata.TagList.Item
        text={value.status === "0" ? "Enabled" : "Disabled"}
        icon={value.status === "0" ? Icon.Checkmark : Icon.CircleDisabled}
        color={value.status === "0" ? Color.Green : Color.SecondaryText}
        key={0}
      />,
    ];

    if (value.state === "1")
      tags.push(
        <List.Item.Detail.Metadata.TagList.Item
          text="Not Supported"
          icon={Icon.XMarkCircle}
          color={Color.Red}
          key={tags.length}
        />,
      );

    return (
      <List.Item.Detail.Metadata.TagList title="Status">
        {tags}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.status, value.state]);

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

    if (!problems.length) return;
    return (
      <List.Item.Detail.Metadata.TagList title="Problems">
        {problems}
      </List.Item.Detail.Metadata.TagList>
    );
  }, [value.triggers]);

  const metaItemError = React.useMemo(() => {
    if (!value.error) return;
    return <List.Item.Detail.Metadata.Label title="Error" text={value.error} />;
  }, [value.error]);

  return (
    <List.Item.Detail.Metadata>
      {metaHostName}
      {metaHostDescription}
      {metaItemName}
      {metaItemDescription}
      {metaItemType}
      {metaItemHistory}
      {metaItemTime}
      {metaItemLastValue}
      {metaItemPrevValue}
      {metaItemTags}
      {metaItemStatus}
      {metaTriggerBySeverity}
      {metaItemError}
    </List.Item.Detail.Metadata>
  );
}

export function DetailItems({
  value,
  showHostMeta,
}: {
  value: Types.DataItemsView;
  showHostMeta: boolean;
}): React.JSX.Element {
  return (
    <List.Item.Detail
      metadata={<MetadataItems value={value} showHostMeta={showHostMeta} />}
    />
  );
}
