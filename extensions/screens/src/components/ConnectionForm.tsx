import { Action, ActionPanel, Form, Icon, useNavigation } from '@raycast/api';
import { useState } from 'react';
import { ClientProtocol } from '../archive';
import { TYPE_ICONS, TYPE_SECTIONS, sectionTitle, typeForSection } from '../connection-type';
import { SavedConnection } from '../library';

type TargetKind = 'saved' | 'direct';

type FormValues = {
  name: string;
  section: string;
  protocol: ClientProtocol;
  kind: TargetKind;
  identifier: string;
  url: string;
};

/**
 * Adds a connection or edits one. Screens' library is where most of these come from, but it can't
 * distinguish two connections sharing a name, and a hostname it recorded may not be the one that
 * answers, so what a row opens stays editable without touching Screens.
 */
export default function ConnectionForm({
  connection,
  isNew = false,
  onSave,
}: {
  connection: SavedConnection;
  isNew?: boolean;
  onSave: (connection: SavedConnection) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [kind, setKind] = useState<TargetKind>(connection.target.kind);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  async function submit(values: FormValues) {
    const missing: Partial<Record<keyof FormValues, string>> = {};
    if (!values.name.trim()) missing.name = 'Required';
    if (values.kind === 'saved' && !values.identifier.trim()) missing.identifier = 'Required';
    if (values.kind === 'direct' && !values.url.trim()) missing.url = 'Required';

    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      return;
    }

    await onSave({
      id: connection.id,
      name: values.name.trim(),
      type: typeForSection(values.section, connection.type),
      clientProtocol: values.protocol,
      target:
        values.kind === 'saved'
          ? { kind: 'saved', identifier: values.identifier.trim(), ambiguous: false }
          : { kind: 'direct', url: values.url.trim() },
    });
    pop();
  }

  function clear(field: keyof FormValues) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return (
    <Form
      navigationTitle={isNew ? 'Add Connection' : `Edit ${connection.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isNew ? 'Add Connection' : 'Save'} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={connection.name}
        placeholder="Shown in Raycast"
        error={errors.name}
        onChange={() => clear('name')}
      />
      <Form.Dropdown id="section" title="Type" defaultValue={sectionTitle(connection.type)}>
        {TYPE_SECTIONS.map((section) => (
          <Form.Dropdown.Item
            key={section.title}
            value={section.title}
            title={section.title}
            icon={TYPE_ICONS[section.types[0]]}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="protocol" title="Protocol" defaultValue={connection.clientProtocol}>
        <Form.Dropdown.Item value="vnc" title="VNC" icon={Icon.Monitor} />
        <Form.Dropdown.Item value="rdp" title="RDP" icon={Icon.Window} />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown id="kind" title="Connect Via" value={kind} onChange={(value) => setKind(value as TargetKind)}>
        <Form.Dropdown.Item value="saved" title="Saved Connection" icon={Icon.Desktop} />
        <Form.Dropdown.Item value="direct" title="Direct Address" icon={Icon.Globe} />
      </Form.Dropdown>
      {kind === 'saved' ? (
        <Form.TextField
          id="identifier"
          title="Name or Hostname"
          defaultValue={connection.target.kind === 'saved' ? connection.target.identifier : ''}
          placeholder="What Screens should match"
          info="Screens looks this up in its own library, so the connection keeps its stored settings and credentials. It has to match exactly one connection there."
          error={errors.identifier}
          onChange={() => clear('identifier')}
        />
      ) : (
        <Form.TextField
          id="url"
          title="Address"
          defaultValue={connection.target.kind === 'direct' ? connection.target.url : ''}
          placeholder="vnc://host or ssh://host"
          info="Connects straight to this address, bypassing the connection saved in Screens and the credentials stored with it."
          error={errors.url}
          onChange={() => clear('url')}
        />
      )}
    </Form>
  );
}
