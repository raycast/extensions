import { type ComponentProps } from 'react';
import { List } from '@raycast/api';

export type ItemAccessory = NonNullable<ComponentProps<typeof List.Item>['accessories']>[number];
