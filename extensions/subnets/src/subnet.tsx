import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useMemo, useState } from "react";
import {
  describe,
  formatCount,
  nextSubnet,
  previousSubnet,
  splitInTwo,
  summary,
  supernet,
  toCidr,
  type Subnet,
  type SubnetInfo,
} from "./lib/ip";

const EXAMPLES = ["10.0.0.0/16", "192.168.1.0/24", "172.16.5.23/20", "2001:db8::/32", "fd00::/48"];

export default function Command(props: LaunchProps<{ arguments: { cidr?: string } }>) {
  return <SubnetList initialText={props.arguments?.cidr ?? ""} isRoot />;
}

function SubnetList({ initialText, isRoot = false }: { initialText: string; isRoot?: boolean }) {
  const [searchText, setSearchText] = useState(initialText);
  const info = useMemo(() => describe(searchText), [searchText]);
  const trimmed = searchText.trim();

  return (
    <List
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Subnet or IP — 10.0.0.0/16, 192.168.1.5, 2001:db8::/32"
      navigationTitle={isRoot || !info ? undefined : info.cidr}
    >
      {trimmed === "" ? (
        <List.Section title="Examples">
          {EXAMPLES.map((example) => (
            <List.Item
              key={example}
              icon={Icon.Globe}
              title={example}
              subtitle={example.includes(":") ? "IPv6" : "IPv4"}
              actions={
                <ActionPanel>
                  <Action title="Use This Example" icon={Icon.ArrowRight} onAction={() => setSearchText(example)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : info ? (
        <Results info={info} />
      ) : (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="Not a valid address"
          description={`"${trimmed}" is not an IPv4 or IPv6 address or CIDR block. Try 10.0.0.0/16.`}
        />
      )}
    </List>
  );
}

function Results({ info }: { info: SubnetInfo }) {
  const halves = splitInTwo(info);
  const next = nextSubnet(info);
  const previous = previousSubnet(info);
  const parent = supernet(info);

  return (
    <>
      <List.Section title={`IPv${info.version} · ${info.cidr}`}>
        <ValueItem
          info={info}
          icon={Icon.Globe}
          value={info.networkText}
          label="Network address"
          tag={info.hasHostBits ? `contains ${info.addressText}` : undefined}
        />
        <ValueItem
          info={info}
          icon={Icon.ArrowsExpand}
          value={`${info.networkText} - ${info.lastText}`}
          label="Network range"
        />
        <ValueItem info={info} icon={Icon.Hashtag} value={`/${info.prefix}`} label="Prefix" />
        <ValueItem
          info={info}
          icon={Icon.Calculator}
          value={formatCount(info.size, info.hostBits)}
          label="Addresses"
          copy={info.size.toString()}
        />
        {info.netmask ? <ValueItem info={info} icon={Icon.Code} value={info.netmask} label="Netmask" /> : null}
      </List.Section>

      <List.Section title="Navigate">
        {halves ? (
          <NavigationItem info={info} target={halves[0]} label="Split in two · first half" icon={Icon.ArrowDown} />
        ) : null}
        {halves ? (
          <NavigationItem info={info} target={halves[1]} label="Split in two · second half" icon={Icon.ArrowDown} />
        ) : null}
        {next ? <NavigationItem info={info} target={next} label="Next subnet" icon={Icon.ArrowRight} /> : null}
        {previous ? (
          <NavigationItem info={info} target={previous} label="Previous subnet" icon={Icon.ArrowLeft} />
        ) : null}
        {parent ? (
          <NavigationItem info={info} target={parent} label="Supernet · one bit wider" icon={Icon.ArrowUp} />
        ) : null}
      </List.Section>
    </>
  );
}

function ValueItem({
  info,
  icon,
  value,
  label,
  tag,
  copy,
}: {
  info: SubnetInfo;
  icon: Icon;
  value: string;
  label: string;
  tag?: string;
  copy?: string;
}) {
  const content = copy ?? value;
  return (
    <List.Item
      icon={icon}
      title={value}
      subtitle={label}
      accessories={tag ? [{ tag: { value: tag, color: Color.SecondaryText } }] : undefined}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${label}`} content={content} />
          <Action.Paste title={`Paste ${label}`} content={content} />
          <SharedActions info={info} />
        </ActionPanel>
      }
    />
  );
}

function NavigationItem({
  info,
  target,
  label,
  icon,
}: {
  info: SubnetInfo;
  target: Subnet;
  label: string;
  icon: Icon;
}) {
  const cidr = toCidr(target);
  return (
    <List.Item
      icon={icon}
      title={cidr}
      subtitle={label}
      accessories={[
        { text: `${formatCount(1n << BigInt(target.bits - target.prefix), target.bits - target.prefix)} addresses` },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Open Subnet" icon={Icon.ArrowRight} target={<SubnetList initialText={cidr} />} />
          <Action.CopyToClipboard title="Copy CIDR" content={cidr} />
          <Action.Paste title="Paste CIDR" content={cidr} />
          <SharedActions info={info} />
        </ActionPanel>
      }
    />
  );
}

function SharedActions({ info }: { info: SubnetInfo }) {
  return (
    <ActionPanel.Section title={info.cidr}>
      <Action.CopyToClipboard
        title="Copy Summary"
        icon={Icon.Document}
        content={summary(info)}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
    </ActionPanel.Section>
  );
}
