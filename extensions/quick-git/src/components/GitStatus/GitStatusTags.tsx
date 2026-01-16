import { useMemo } from "react";
import { Color, List } from "@raycast/api";
import type { StatusValue } from "../../utils/git-status/changes.js";
import { ChangeStatus, parseStatusValueName } from "../../utils/git-status/changes.js";

interface Props {
  changes: ChangeStatus;
}

function colorForStatus(stagedStatus: StatusValue) {
  if (stagedStatus === ".") {
    return;
  }

  switch (stagedStatus) {
    case "A":
      return Color.Green;
    case "M":
      return Color.Blue;
    case "T":
      return Color.Blue;
    case "D":
      return Color.Red;
    case "R":
      return Color.Magenta;
    case "C":
      return Color.Magenta;
    case "U":
      return Color.Orange;
    case "?":
      return Color.Green;
    case "!":
      return Color.SecondaryText;
  }
}

export function GitStatusTags({ changes }: Props) {
  const tags = useMemo(() => {
    const tags = [];

    if (changes.hasStagedChanges) {
      tags.push(["Staged", Color.PrimaryText]);
      const status = parseStatusValueName(changes.stagedChanges);
      if (status) {
        tags.push([status, colorForStatus(changes.stagedChanges)]);
      }
    }

    if (changes.hasUnstagedChanges) {
      tags.push(["Unstaged", Color.SecondaryText]);

      if (changes.unstagedChanges !== changes.stagedChanges) {
        const status = parseStatusValueName(changes.unstagedChanges);
        if (status) {
          tags.push([status, colorForStatus(changes.unstagedChanges)]);
        }
      }
    }

    return tags;
  }, [changes.hasStagedChanges, changes.stagedChanges, changes.hasUnstagedChanges, changes.unstagedChanges]);

  const tagList = useMemo(
    () => tags.map((tag, index) => <List.Item.Detail.Metadata.TagList.Item key={index} text={tag[0]} color={tag[1]} />),
    [tags],
  );

  return <List.Item.Detail.Metadata.TagList title="Status">{tagList}</List.Item.Detail.Metadata.TagList>;
}
