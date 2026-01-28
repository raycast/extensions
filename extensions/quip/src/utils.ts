import { environment, getPreferenceValues } from '@raycast/api';
import fs from 'fs';
import stream from 'stream/promises';
import fetch from 'node-fetch';
import mime from 'mime-types';
import { NodeHtmlMarkdown } from 'node-html-markdown';

export const preferences = getPreferenceValues<Preferences>();

type Preferences = {
  personalAccessToken: string;
  endpoint: string;
  onlyMatchTitles?: boolean;
};

export async function downloadBlob(src: string) {
  // src should look like /blob/{threadId}/{blobId}
  const [threadId, blobId] = src.split('/').slice(-2);

  fs.mkdirSync(`${environment.supportPath}/${threadId}`, { recursive: true });

  const resp = await fetch(`${preferences.endpoint}/1${src}`, {
    headers: {
      Authorization: `Bearer ${preferences.personalAccessToken}`,
    },
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`download ${src} failed: ${resp.status}`);
  }

  const contentTypes = resp.headers.get('content-type') || '';
  const filePath = `${environment.supportPath}/${threadId}/${blobId}.${mime.extension(contentTypes)}`;
  console.log(`download ${src} to ${filePath}`);

  await stream.pipeline(resp.body, fs.createWriteStream(filePath));

  return filePath;
}

export function formatThreadDetailMarkdown(html: string) {
  const blobs: string[] = [];
  const markdown = NodeHtmlMarkdown.translate(
    html,
    {},
    {
      pre: {
        preserveWhitespace: true,
        postprocess: ({ node, options: { codeFence } }) =>
          `${codeFence}\n${NodeHtmlMarkdown.translate(node.innerHTML, {
            globalEscape: [/$^/, ''], // disable global escape since we are in code block
          })}\n${codeFence}`,
      },
      img: ({ node, options }) => {
        const src = node.getAttribute('src') || '';
        if (!src || (!options.keepDataImages && /^data:/i.test(src))) return { ignore: true };

        if (src.startsWith('/blob/')) {
          blobs.push(src);
        }

        const alt = node.getAttribute('alt') || '';
        const title = node.getAttribute('title') || '';

        return {
          content: `![${alt}](${src}${title && ` "${title}"`})`,
          recurse: false,
        };
      },
    },
  );

  return { markdown, blobs };
}
