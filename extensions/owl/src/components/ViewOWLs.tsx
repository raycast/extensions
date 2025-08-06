import { ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import { useCachedStorage } from "../hooks/storage";
import { OWLMapping } from "../types/owl";
import { StorageKey } from "../types/storage";
import { AddOWLAction } from "./AddOWLAction";
import { DeleteOWLAction } from "./DeleteOWLAction";
import { ViewOWLAction } from "./ViewOWLAction";

export function ViewOWLs(
  props: Readonly<{
    language: string;
  }>,
) {
  const { language } = props;

  const [owls] = useCachedStorage<OWLMapping>(StorageKey.OWLS, {});
  const languageMappings = useMemo(() => {
    return owls[language] ?? [];
  }, [language, owls]);

  return (
    <List>
      <List.EmptyView
        title={`No OWLs found for ${language}`}
        actions={
          <ActionPanel>
            <AddOWLAction base={language} />
          </ActionPanel>
        }
      />
      {languageMappings.map((owl) => {
        return (
          <List.Item
            key={owl.id}
            title={`${owl.from} -> ${owl.to}`}
            actions={
              <ActionPanel>
                <ViewOWLAction owl={owl} />
                <AddOWLAction base={language} />
                <DeleteOWLAction owl={owl} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
