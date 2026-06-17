import { Color, Grid } from '@raycast/api';

export default ({ title, description }: { title: string; description: string }) => (
  <Grid.EmptyView
    title={title}
    description={description}
    icon={{ tintColor: Color.Red, source: 'command-icon-small.png' }}
  />
);
