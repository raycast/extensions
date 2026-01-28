import {
  showHUD,
  getFrontmostApplication,
  closeMainWindow,
  getPreferenceValues,
} from '@raycast/api';
import { keydownAction } from './utils/keydownAction';
import resources from './data/resources.json';
import { Key, Modifier } from './types/key';
import { getResources } from './services/resource';
import { getActiveTabUrl } from './utils/getActiveTabUrl';

const { browsers } = resources;

async function applyToWebsite(url: URL | null, runKeydown: ReturnType<typeof keydownAction>) {
  if (!url) {
    return showHUD('Active tab not found. Please ensure application is a valid browser.');
  }

  const resources = await getResources();

  for (const resource of resources) {
    if (resource.type === 'website' && url.href.includes(resource.matchPattern)) {
      await closeMainWindow();
      return runKeydown(resource.key as Key, resource.modifiers as Modifier[]);
    }
  }

  return showHUD('Invalid command for this website');
}

export default async function applyInlineCode() {
  const frontmostApplication = await getFrontmostApplication();
  const { name: appName } = frontmostApplication;
  const { customBrowser } = getPreferenceValues();

  const runKeydown = keydownAction(appName);

  if (browsers.includes(appName) || customBrowser?.name === appName) {
    const url = await getActiveTabUrl(appName);

    return applyToWebsite(url, runKeydown);
  }

  const resources = await getResources();

  for (const resource of resources) {
    if (resource.type === 'application' && appName === resource.name) {
      await closeMainWindow();
      return runKeydown(resource.key as Key, resource.modifiers as Modifier[]);
    }
  }

  return showHUD('Invalid command for this application');
}
