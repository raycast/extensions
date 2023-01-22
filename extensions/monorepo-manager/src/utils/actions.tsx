import { Action, Icon } from '@raycast/api';
import * as cached from '../utils/cache';
import { iconSublimeText, iconVSCode } from './icons';

export function getCommonActions(path: string) {
  return [
    <Action.ShowInFinder key="open-in-finder" title="Open in Finder" path={path} />,
    <Action.CopyToClipboard key="copy-path" title="Copy Path" content={path} icon={Icon.CopyClipboard} />,
    <Action key="clear-cache" title="Clear Cache" onAction={cached.clear} icon={Icon.Circle} />,
  ];
}

export function getOpenInEditorActions(path: string) {
  return [
    <Action.Open
      application="Visual Studio Code"
      key="open-in-vs-code"
      title="Open in Visual Studio Code"
      target={path}
      icon={iconVSCode}
    />,
    <Action.Open
      application="Sublime Text"
      key="open-in-sublime-text"
      title="Open in Sublime Text"
      target={path}
      icon={iconSublimeText}
    />,
  ];
}
