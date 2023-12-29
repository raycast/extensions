import { Action, Detail, Icon } from "@raycast/api";

import { VaultCredential } from "@/types/dcli";

type Props = {
  item: VaultCredential;
};

export default function ShowNoteAction({ item }: Props) {
  const name = item.title ?? item.url;
  if (!item.note || !name) return;

  return (
    <Action.Push
      title="Show Note"
      target={<DetailNote name={name} note={item.note} />}
      icon={Icon.Paragraph}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

function DetailNote({ name, note }: { name: string; note: string }) {
  const markdown = `# 📄 ${name}
  &nbsp;
  \`\`\`
  ${note}
  \`\`\`
  `;

  return <Detail navigationTitle={`Note for ${name}`} markdown={markdown} />;
}
