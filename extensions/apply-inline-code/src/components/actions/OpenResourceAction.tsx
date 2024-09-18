import { Action, closeMainWindow, getFrontmostApplication, showHUD } from '@raycast/api';
import { browsers } from '../../data/resources.json';
import { Resource } from '../../types/resource';
import { Website } from '../../types/website';
import { Application } from '../../types/application';
import { keydownAction } from '../../utils/keydownAction';
import { getActiveTabUrl } from '../../utils/getActiveTabUrl';

const applyToWebsite = async (website: Website) => {
  const frontmostApplication = await getFrontmostApplication();
  const { name: appName } = frontmostApplication;

  const url = await getActiveTabUrl(appName);

  if (!url) {
    return showHUD('Active tab not found.');
  }

  const runKeydown = keydownAction(appName);

  if (browsers.includes(appName) && url.href.includes(website.matchPattern)) {
    await closeMainWindow();
    return runKeydown(website.key, website.modifiers);
  }

  return showHUD('Active tab does not match the website config.');
};

async function applyToApplication(application: Application) {
  const runKeydown = keydownAction(application.name);

  runKeydown(application.key, application.modifiers);
}

function OpenResourceAction({ resource }: { resource: Resource }) {
  const { type } = resource;
  const isWebsite = type === 'website';
  const isApplication = type === 'application';
  const url = isWebsite ? resource.url : '';
  const path = isApplication ? resource.path : '';

  return (
    <>
      {isWebsite && (
        <>
          <Action title="Apply To Active Tab" onAction={() => applyToWebsite(resource)} />
          <Action.OpenInBrowser url={url} shortcut={{ modifiers: ['ctrl'], key: 'g' }} />
        </>
      )}
      {isApplication && (
        <>
          <Action.Open
            target={path}
            title="Apply To Application"
            shortcut={{ modifiers: ['ctrl'], key: 'enter' }}
            onOpen={() => applyToApplication(resource)}
          />
          <Action.Open
            target={path}
            title="Launch Application"
            shortcut={{ modifiers: ['ctrl'], key: 'g' }}
          />
        </>
      )}
    </>
  );
}

export default OpenResourceAction;
