import { List } from '@raycast/api';

import { errorMessage } from '../lib/format';
import { ErrorActions } from './actions';

export function ErrorView({ error, title }: { error: unknown; title: string }) {
  return (
    <List.EmptyView
      title={title}
      description={errorMessage(error)}
      actions={<ErrorActions error={error} />}
    />
  );
}
