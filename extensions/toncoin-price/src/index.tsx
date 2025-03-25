import { getIcon } from "@/helpers";
import { dexLinks, spotLinks, usefulLinks } from "@/links";
import { useSource } from "@/sources/useSource";
import { Perferences } from "@/types";
import { MenuBarExtra, getPreferenceValues, open } from "@raycast/api";

export default function Command() {
  const { source } = getPreferenceValues<Perferences>();
  const { isLoading, data, error } = useSource(source);

  return (
    <MenuBarExtra
      title={error ? "Error" : data?.lastPrice}
      isLoading={isLoading}
      icon={{
        source: {
          light: "../assets/toncoin-logo-dark.svg",
          dark: "../assets/toncoin-logo-light.svg",
        },
      }}
      tooltip="Show Toncoin price"
    >
      {spotLinks.section && (
        <MenuBarExtra.Section title={spotLinks.section.title}>
          {spotLinks.section.items.map((link, index) => (
            <MenuBarExtra.Item
              key={index}
              title={link.title}
              subtitle={link.subtitle}
              onAction={async () => await open(link.url)}
              icon={getIcon(link)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {dexLinks.section && (
        <MenuBarExtra.Section title={dexLinks.section.title}>
          {dexLinks.section.items.map((link, index) => (
            <MenuBarExtra.Item
              key={index}
              title={link.title}
              subtitle={link.subtitle}
              onAction={async () => await open(link.url)}
              icon={getIcon(link)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {usefulLinks.section && (
        <MenuBarExtra.Section title={usefulLinks.section.title}>
          {usefulLinks.section.items.map((link, index) => (
            <MenuBarExtra.Item
              key={index}
              title={link.title}
              onAction={async () => await open(link.url)}
              icon={getIcon(link)}
            />
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
