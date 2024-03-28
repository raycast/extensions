import { Action, ActionPanel, Detail, Icon } from '@raycast/api';
import { Cast } from '../utils/types';
import { getUserIcon, getCastUrl } from '../utils/helpers';

export default function CastDetails({ cast }: { cast: Cast }) {
  // console.log('🚀 ~ CastDetails ~ cast:', cast);
  // todo: render image from frame
  return (
    <Detail
      markdown={cast.text}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Replies" text={cast.replies.count.toString()} icon={Icon.Message} />
          <Detail.Metadata.Label title="Recasts" text={cast.reactions.recasts.length.toString()} icon={Icon.Repeat} />
          <Detail.Metadata.Label title="Likes" text={cast.reactions.likes.length.toString()} icon={Icon.Heart} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Author" text={cast.author.username} icon={getUserIcon(cast.author)} />
          <Detail.Metadata.Label title="FID" text={cast.author.fid.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={getCastUrl(cast)} />
        </ActionPanel>
      }
    />
  );
}
