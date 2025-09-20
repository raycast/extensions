import {
  Action,
  ActionPanel,
  Icon,
  getPreferenceValues,
  LocalStorage,
  Detail,
  Clipboard,
  openExtensionPreferences,
} from '@raycast/api';
import { useEffect, useRef, useState } from 'react';
import ImageKit from 'imagekit';
import fs from 'fs/promises';
import crypto from 'crypto';
import { imageMeta } from 'image-meta';
import { ImageMeta, Preferences } from './common/types';
import { ImageDetailMetadata } from './common/components/image-detail-metadata';
import { getDetailImage } from './common/utils/imagekit';

type StateType =
  | {
      status: 'initial' | 'no-input' | 'image-format-invalid' | 'canceled';
    }
  | {
      status: 'error';
      message: string;
    }
  | {
      status: 'succeed';
      cache: boolean;
      image: ImageMeta;
    };

export default function Command() {
  const [state, setState] = useState<StateType>({
    status: 'initial',
  });

  const { publicKey, privateKey, urlEndpoint } =
    getPreferenceValues<Preferences>();

  const { current: imagekit } = useRef(
    new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    }),
  );

  useEffect(() => {
    const load = async () => {
      let { file: image } = await Clipboard.read();
      if (!image) {
        setState({
          status: 'no-input',
        });
        return;
      }

      image = decodeURIComponent(image);

      if (image.startsWith('file://')) {
        image = image.slice(7);
      }

      const data = await fs.readFile(image);
      const meta = await imageMeta(data);

      if (!meta?.type) {
        setState({
          status: 'image-format-invalid',
        });
        return;
      }

      const type = meta.type;
      const hash = crypto.createHash('sha256').update(data).digest('base64url');

      const record = await LocalStorage.getItem<string>(hash);

      if (record) {
        setState({
          status: 'succeed',
          cache: true,
          image: JSON.parse(record),
        });
        return;
      }
      try {
        const res = await imagekit.upload({
          file: data,
          fileName: `${hash}.${type}`,
          useUniqueFileName: false,
        });

        const {
          fileId,
          url,
          size = data.length,
          height = meta.height,
          width = meta.height,
          thumbnailUrl,
        } = res;

        const newRecord: ImageMeta = {
          fileId,
          hash,
          from: 'clipboard',
          source: image,
          format: type,
          url,
          size,
          height,
          width,
          thumbnailUrl,
          createdAt: Date.now(),
        };

        await LocalStorage.setItem(hash, JSON.stringify(newRecord));

        setState({
          status: 'succeed',
          cache: false,
          image: newRecord,
        });
      } catch (e) {
        setState({
          status: 'error',
          message: `\
# Failed to upload the image 

ImageKit.io responded with error: \`${(e as Error).message}\`

Please check out your preferences, make sure your settings are all right and try again.
`,
        });
      }
    };

    load();
  }, []);

  const MARKDOWN_TEXT =
    state.status === 'error'
      ? state.message
      : state.status === 'succeed'
        ? `![Image Title](${getDetailImage(state.image.url, 360)})`
        : state.status === 'initial'
          ? '**uploading...**'
          : 'No images in the clipboard';

  const navigationTitle =
    state.status === 'error'
      ? 'Failed to upload'
      : state.status === 'initial'
        ? 'Uploading'
        : 'Uploaded successfully';

  return (
    <Detail
      markdown={MARKDOWN_TEXT}
      navigationTitle={navigationTitle}
      isLoading={state.status === 'initial'}
      metadata={
        state.status === 'succeed' ? (
          <ImageDetailMetadata image={state.image} />
        ) : null
      }
      actions={
        state.status === 'succeed' ? (
          <ActionPanel>
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy Image CDN URL to Clipboard"
              content={state.image.url}
            />
            <Action.OpenInBrowser url={state.image.url} />
            <Action.CopyToClipboard
              icon={Icon.CopyClipboard}
              title="Copy Markdown Content to Clipboard"
              content={`![image from clipboard](${state.image.url})`}
            />
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        ) : state.status === 'error' ? (
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        ) : null
      }
    />
  );
}
