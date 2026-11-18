import { Action, Keyboard } from '@raycast/api';

type OpenInThingsProps = {
  id: string;
  title: string;
};

export default function OpenInThings({ id, title }: OpenInThingsProps) {
  return (
    <Action.Open
      title={title}
      icon="things-flat.png"
      target={`things:///show?id=${id}`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}
