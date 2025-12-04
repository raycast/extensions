import { Detail } from '@raycast/api';
import { ImageMeta } from '../types';
import { toUnit } from '../utils/to-unit';
import { format, formatDistanceToNow } from 'date-fns';

export type ImageDetailMetadataProps = {
  image: ImageMeta;
};

export function ImageDetailMetadata({ image }: ImageDetailMetadataProps) {
  const createdAt = new Date(image.createdAt);
  return (
    <Detail.Metadata>
      <Detail.Metadata.Link title="URL" target={image.url} text={image.url} />
      <Detail.Metadata.Label title="Source" text={image.source} />
      <Detail.Metadata.Label
        title="Upload Time"
        text={
          formatDistanceToNow(createdAt) +
          ' ago, ' +
          format(new Date(image.createdAt), 'HH:mm:ss MM/dd/yyyy')
        }
      />
      <Detail.Metadata.Separator />
      {image.format && (
        <Detail.Metadata.Label
          title="Format"
          text={(image.format.startsWith('.')
            ? image.format.slice(1)
            : image.format
          ).toUpperCase()}
        />
      )}
      {image.size && (
        <Detail.Metadata.Label title="Size" text={toUnit(image.size)} />
      )}
      {image.width && (
        <Detail.Metadata.Label title="Width" text={String(image.width)} />
      )}
      {image.height && (
        <Detail.Metadata.Label title="Height" text={String(image.height)} />
      )}
    </Detail.Metadata>
  );
}
