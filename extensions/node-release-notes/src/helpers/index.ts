import { Color, Icon } from '@raycast/api';
import type { AsyncState } from '@raycast/utils';
import { COLOR_TAGS, FILTERS, NODE_BASE_URL } from '../config';
import type { FilterValue, NodeVersionElement } from '../types';

export function createVersionsBySection(data: NodeVersionElement[]) {
  return Object.entries(
    data.reduce<{ [sectionTitle: string]: NodeVersionElement[] }>((previousValue, element) => {
      const [sectionTitle] = element.version.split('.');

      return {
        ...previousValue,
        [sectionTitle]: (previousValue[sectionTitle] || []).concat(element),
      };
    }, {}),
  );
}

export function createNodeDocsUrl(version: string) {
  return `${NODE_BASE_URL}/docs/${version}/api/`;
}

export function isFilterValue(value: unknown): value is FilterValue {
  return FILTERS.some((filter) => filter.value === value);
}

export const execOutputToStatus = ({ data, error, isLoading }: AsyncState<string>) => {
  if (error) {
    return 'Error';
  }
  if (isLoading) {
    return 'Loading';
  }
  if (data) {
    return 'Success';
  }
  return 'Unknown';
};

export function getColorTag(tag: keyof typeof COLOR_TAGS) {
  return COLOR_TAGS[tag] || Color.SecondaryText;
}

export function createDateItemAccessory(stringDate?: string) {
  if (!stringDate) {
    return {};
  }

  const date = new Date(stringDate);

  return {
    text: {
      value: date.toLocaleDateString(undefined, {
        dateStyle: 'short',
      }),
    },

    icon: Icon.Calendar,
    tooltip: date.toLocaleDateString(undefined, {
      dateStyle: 'long',
    }),
  };
}
