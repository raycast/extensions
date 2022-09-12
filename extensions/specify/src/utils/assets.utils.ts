import { environment, Icon } from '@raycast/api';
import axios from 'axios';
import * as fs from 'fs';
import slugify from 'slugify';
import { copyFileByPath } from './appleScript.utils';

export const copyImage = async (url: string, format: string) => {
  const selectedPath = environment.supportPath;
  const filePath = selectedPath.endsWith('/') ? `${selectedPath}bitmap.${format}` : `${selectedPath}/bitmap.${format}`;

  const { data } = await axios({
    url: url,
    method: 'GET',
    responseType: 'arraybuffer',
  });

  fs.writeFileSync(filePath, Buffer.from(data));
  await copyFileByPath(filePath);
};

export const copyVector = async (url: string, format: string, name: string) => {
  const selectedPath = environment.supportPath;
  const slug = format === 'pdf' ? `${slugify(name)}-from-pdf` : slugify(name);
  const svgPath = selectedPath.endsWith('/') ? `${selectedPath}${slug}.svg` : `${selectedPath}/${slug}.svg`;
  const fileExists = fs.existsSync(svgPath);

  if (format === 'svg' && !fileExists) {
    const { data } = await axios({
      url: url,
      method: 'GET',
      responseType: 'arraybuffer',
    });

    fs.writeFileSync(svgPath, Buffer.from(data));
  }

  await copyFileByPath(svgPath);
};

export const getDisplayableSVG = async (name: string, url: string) => {
  const selectedPath = environment.supportPath;
  const slug = slugify(name);
  const svgPath = selectedPath.endsWith('/') ? `${selectedPath}${slug}.svg` : `${selectedPath}/${slug}.svg`;

  const { data } = await axios({
    url: url,
    method: 'GET',
    responseType: 'arraybuffer',
  });

  fs.writeFileSync(svgPath, Buffer.from(data));

  return svgPath;
};

export const getDisplayablePDF = async () => {
  return Icon.QuestionMark;
};
