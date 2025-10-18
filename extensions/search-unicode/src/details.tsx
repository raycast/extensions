import { Detail } from "@raycast/api";
import type { Entry } from "./types";
import { getCharSvg } from "./utils";

export function ItemDetails({ item }: { item: Entry }) {
  const metadata: Array<React.ReactElement | "separator"> = [];

  // Aliases section
  if (item.aliases) {
    metadata.push(
      <Detail.Metadata.TagList title="Aliases" key="aliases">
        {item.aliases.split(", ").map((alias) => (
          <Detail.Metadata.TagList.Item key={alias} text={alias} />
        ))}
      </Detail.Metadata.TagList>,
    );
    metadata.push("separator");
  }

  // Unicode information section
  if (item.cpoint)
    metadata.push(
      <Detail.Metadata.Label
        title="Codepoint"
        text={item.cpoint}
        key="cpoint"
      />,
    );
  if (item.block)
    metadata.push(
      <Detail.Metadata.Label title="Block" text={item.block} key="block" />,
    );
  if (item.script)
    metadata.push(
      <Detail.Metadata.Label title="Script" text={item.script} key="script" />,
    );
  if (item.cat)
    metadata.push(
      <Detail.Metadata.Label title="Category" text={item.cat} key="cat" />,
    );
  if (item.plane)
    metadata.push(
      <Detail.Metadata.Label title="Plane" text={item.plane} key="plane" />,
    );
  if (item.width)
    metadata.push(
      <Detail.Metadata.Label
        title="Character Width"
        text={item.width}
        key="width"
      />,
    );
  if (item.cells)
    metadata.push(
      <Detail.Metadata.Label
        title="Number of Cells to Display as"
        text={item.cells}
        key="cells"
      />,
    );
  if (item.unicode)
    metadata.push(
      <Detail.Metadata.Label
        title="First Assigned in Unicode"
        text={item.unicode}
        key="unicode"
      />,
    );
  metadata.push("separator");

  // Encoding section
  if (item.hex)
    metadata.push(
      <Detail.Metadata.Label title="Hex" text={item.hex} key="hex" />,
    );
  if (item.dec)
    metadata.push(
      <Detail.Metadata.Label title="Dec" text={item.dec} key="dec" />,
    );
  if (item.oct)
    metadata.push(
      <Detail.Metadata.Label title="Oct" text={item.oct} key="oct" />,
    );
  if (item.bin)
    metadata.push(
      <Detail.Metadata.Label title="Bin" text={item.bin} key="bin" />,
    );
  if (item.utf8)
    metadata.push(
      <Detail.Metadata.Label title="UTF-8" text={item.utf8} key="utf8" />,
    );
  if (item.utf16be)
    metadata.push(
      <Detail.Metadata.Label
        title="UTF-16 BE"
        text={item.utf16be}
        key="utf16be"
      />,
    );
  if (item.utf16le)
    metadata.push(
      <Detail.Metadata.Label
        title="UTF-16 LE"
        text={item.utf16le}
        key="utf16le"
      />,
    );
  metadata.push("separator");

  // Escape sequences section
  if (item.html)
    metadata.push(
      <Detail.Metadata.Label title="HTML entity" text={item.html} key="html" />,
    );
  if (item.xml)
    metadata.push(
      <Detail.Metadata.Label title="XML entity" text={item.xml} key="xml" />,
    );
  if (item.json)
    metadata.push(
      <Detail.Metadata.Label title="JSON escape" text={item.json} key="json" />,
    );
  if (item.digraph)
    metadata.push(
      <Detail.Metadata.Label
        title="Vim Digraph"
        text={item.digraph}
        key="digraph"
      />,
    );
  if (item.keysym)
    metadata.push(
      <Detail.Metadata.Label
        title="X11 Keysym"
        text={item.keysym}
        key="keysym"
      />,
    );
  metadata.push("separator");

  // Properties and references section
  if (item.props) {
    metadata.push(
      <Detail.Metadata.TagList title="Properties" key="props">
        {item.props.split(", ").map((prop) => (
          <Detail.Metadata.TagList.Item key={prop} text={prop} />
        ))}
      </Detail.Metadata.TagList>,
    );
  }
  if (item.refs) {
    metadata.push(
      <Detail.Metadata.TagList title="Similars and Alternatives" key="refs">
        {item.refs.split(", ").map((ref) => (
          <Detail.Metadata.TagList.Item key={ref} text={ref} />
        ))}
      </Detail.Metadata.TagList>,
    );
  }

  // Trim leading, trailing, and consecutive separators
  const trimmedMetadata = metadata.reduce<React.ReactNode[]>(
    (acc, item, index, array) => {
      if (item === "separator") {
        // Skip leading separators
        if (acc.length === 0) return acc;

        // Skip trailing separators
        const remainingItems = array.slice(index + 1);
        if (remainingItems.every((i) => i === "separator")) return acc;

        // Skip consecutive separators
        const lastItem = acc[acc.length - 1];
        if (
          lastItem &&
          typeof lastItem === "object" &&
          "key" in lastItem &&
          lastItem?.key?.startsWith("separator")
        )
          return acc;

        acc.push(<Detail.Metadata.Separator key={`separator-${index}`} />);
      } else {
        acc.push(item);
      }
      return acc;
    },
    [],
  );

  return (
    <Detail
      navigationTitle={item.name}
      markdown={`# ${item.name}\n\n![${item.name}](${getCharSvg(item, [300, 200])})`}
      metadata={
        <Detail.Metadata>
          <>{trimmedMetadata}</>
        </Detail.Metadata>
      }
    />
  );
}
