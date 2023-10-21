import _ from 'lodash';
import { Clipboard, showHUD, showToast, Toast } from '@raycast/api';
import faker from './faker';
import { UsableLocale } from '@faker-js/faker';

export default async function openQuicklink(options: {
  arguments: { id?: string; section?: string; mode?: 'copy' | 'paste'; locale?: UsableLocale };
}) {
  const { id, section, mode, locale } = options.arguments;

  if (!id || !section || !mode || !locale) {
    showToast({
      title: 'Missing Arguments',
      message: 'This command is not meant to be run directly. Instead, create a quicklink from the generate command.',
      style: Toast.Style.Failure,
    });
    return;
  }

  faker.locale = locale;
  const value = _.get(faker, `${section}.${id}`)();

  if (mode === 'copy') {
    await Clipboard.copy(value);
    showHUD('Copied to Clipboard');
  } else {
    await Clipboard.paste(value.toString());
  }
}
