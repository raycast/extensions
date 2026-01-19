import { List } from "@raycast/api";
import { JSX } from "react";
import type Disk from "../../../models/Disk";

/**
 * Handles rendering of detailed metadata views for disks
 */
export class DiskDetails {
  constructor(private disk: Disk) {}

  /**
   * Recursively render nested Plist metadata
   */
  private renderMetadata(data: unknown, indent = 0, isArrayChild = false): JSX.Element[] {
    if (Array.isArray(data)) {
      // If this array is nested inside a dict (isArrayChild true), simply flatten it without an index label.
      if (isArrayChild) {
        return data.flatMap((item) => this.renderMetadata(item, indent, true));
      } else {
        return data.flatMap((item, index) => [
          <List.Item.Detail.Metadata.Label key={`${index}-label`} title={`${"-".repeat(indent)}[${index}]`} text="" />,
          ...this.renderMetadata(item, indent + 1),
        ]);
      }
    } else if (data && typeof data === "object") {
      return Object.entries(data).flatMap(([key, value]) => {
        if (value && typeof value === "object") {
          if (Array.isArray(value)) {
            return [
              <List.Item.Detail.Metadata.Label
                key={`${key}-label`}
                title={`${"|".repeat(indent * 5)}${key}`}
                text=""
              />,
              ...this.renderMetadata(value, indent + 1, true),
            ];
          } else {
            // When the value is an object, show the key and then flatten the object with an extra row.
            return [
              <List.Item.Detail.Metadata.Label
                key={`${key}-label`}
                title={`${" ".repeat(indent * 2)}${" |".repeat(indent)} ${key}`}
                text=""
              />,
              ...this.renderMetadata(value, indent + 1),
            ];
          }
        }
        // If the value is a primitive, show the key and value (default)
        return (
          <List.Item.Detail.Metadata.Label
            key={key}
            title={`${" ".repeat(indent * 2)}${" |".repeat(indent * 1)} ${key}`}
            text={String(value)}
          />
        );
      });
    }
    return [];
  }

  /**
   * Get summary section for details view
   */
  getDetailsPlistSummary() {
    const dash = "⌀";
    const summary = [
      { key: "Disk Identifier", value: this.disk.identifier },
      { key: "Disk Name", value: this.disk.name },
      { key: "Disk Type", value: this.disk.type },
      { key: "Status", value: this.disk.mountStatus },
      { key: "Mount Point", value: this.disk.mountPoint ?? dash },
      { key: "File System", value: this.disk.fileSystem ?? dash },
      { key: "Size", value: this.disk.size.sizeStr ?? dash },
      { key: "Free Capacity", value: this.disk.freeCapacity.sizeStr ?? dash },
      { key: "Used Capacity", value: this.disk.usedCapacity.sizeStr ?? dash },
      { key: "Total Capacity", value: this.disk.volumeSize.sizeStr ?? dash },
    ];

    return summary.map(({ key, value }) => <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />);
  }

  /**
   * Get the full Plist details view
   */
  getDetailsPlist(): JSX.Element {
    return (
      <List.Item.Detail.Metadata>
        {this.getDetailsPlistSummary()}
        <List.Item.Detail.Metadata.Separator />
        {this.renderMetadata(this.disk.details)}
      </List.Item.Detail.Metadata>
    );
  }

  /**
   * Get the plain text details view
   */
  getDetails(): JSX.Element {
    return (
      <List.Item.Detail.Metadata>
        {this.getDetailsPlistSummary()}
        <List.Item.Detail.Metadata.Separator />
        {Object.entries(this.disk.detailsDict).flatMap(([key, value], index) => [
          <List.Item.Detail.Metadata.Label key={`${key}-${index}`} title={key} text={value || undefined} />,
          value === null ? <List.Item.Detail.Metadata.Separator key={`separator-${index}`} /> : null,
        ])}
      </List.Item.Detail.Metadata>
    );
  }
}
