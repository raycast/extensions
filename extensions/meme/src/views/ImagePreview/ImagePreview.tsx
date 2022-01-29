import path from 'path';
import fs from 'fs';
import {useEffect, useMemo, useState} from 'react';
import {Detail, environment, showToast, ToastStyle} from '@raycast/api';
import Jimp from 'jimp';
import {Meme} from 'types';

interface Props extends Omit<Meme, 'boxCount'> {
  actions?: JSX.Element;
}

export function ImagePreview({id, name, url, actions}: Props) {
  const src = path.join(environment.supportPath, `${id}.jpg`);
  const [loading, setLoading] = useState(true);
  const markdown = useMemo(
    () => `![${name} preview](file://${src.replace(/ /g, '%20')})`,
    [name, src],
  );

  useEffect(() => {
    if (fileExists(src)) {
      setLoading(false);
      return;
    }

    Jimp.read(url)
      .then(async (image) => {
        await image.resize(Jimp.AUTO, 400).writeAsync(src);
        setLoading(false);
      })
      .catch(() => {
        showToast(ToastStyle.Failure, 'Something went wrong loading the image');
      });
  }, [id, url]);

  return (
    <Detail
      isLoading={loading}
      markdown={loading ? null : markdown}
      actions={actions}
    />
  );
}

function fileExists(filepath: string) {
  try {
    fs.accessSync(filepath, fs.constants.F_OK);
  } catch (e) {
    return false;
  }
  return true;
}
