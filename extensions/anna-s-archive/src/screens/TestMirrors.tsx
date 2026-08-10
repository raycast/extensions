import { List } from "@raycast/api";
import { useMirrorDomain } from "@/hooks/use-mirror-domain";
import { MirrorItem } from "@/components/MirrorItem";
import { MIRROR_LIST } from "@/constants";

export const TestMirrors = () => {
  const usedMirror = useMirrorDomain();

  return (
    <List>
      {usedMirror.custom ? (
        <List.Section title="Custom Mirror">
          <MirrorItem
            mirror={usedMirror.url}
            selected
            subtitle="If you encounter issues, please clear this in the extension preferences."
          />
        </List.Section>
      ) : null}
      <List.Section title="All Mirrors">
        {MIRROR_LIST.map((mirror) => (
          <MirrorItem key={mirror} mirror={mirror} selected={mirror === usedMirror.url} />
        ))}
      </List.Section>
    </List>
  );
};
