import { MenuBarExtra, getPreferenceValues, open } from "@raycast/api";
import { dexLinks, spotLinks, usefulLinks } from "@/links";
import { useSource } from "@/sources/useSource";
import { Perferences } from "@/types";

export default function Command() {
  const { source } = getPreferenceValues<Perferences>();
  const { isLoading, data, error } = useSource(source);

  return (
    <MenuBarExtra
      title={error ? "Error" : data?.lastPrice}
      isLoading={isLoading}
      icon="../assets/toncoin-logo.svg"
      tooltip="Show Toncoin price"
    >
      {spotLinks.section && (
        <MenuBarExtra.Section title={spotLinks.section.title}>
          {spotLinks.section.items.map((item, index) => (
            <MenuBarExtra.Item
              key={index}
              title={item.title}
              subtitle={item.subtitle}
              onAction={async () => await open(item.url)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {dexLinks.section && (
        <MenuBarExtra.Section title={dexLinks.section.title}>
          {dexLinks.section.items.map((item, index) => (
            <MenuBarExtra.Item
              key={index}
              title={item.title}
              subtitle={item.subtitle}
              onAction={async () => await open(item.url)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {usefulLinks.section && (
        <MenuBarExtra.Section title={usefulLinks.section.title}>
          {usefulLinks.section.items.map((item, index) => (
            <MenuBarExtra.Item key={index} title={item.title} onAction={async () => await open(item.url)} />
          ))}
        </MenuBarExtra.Section>
      )}
      {error ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item title={error.message} />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Last update time">
          {data && <MenuBarExtra.Item title={new Date(Number(data.timestamp)).toLocaleString()} />}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
