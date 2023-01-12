import { Action, ActionPanel, Grid } from '@raycast/api'
import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { APIkeys, Applications, Groups, Policies, Users } from './pages'

export const IAM = () => (
  <Grid>
    <Grid.Item
      key="Users"
      title="Users"
      content={{
        source: {
          dark: 'icons/iam-user@dark.svg',
          light: 'icons/iam-user@light.svg',
        },
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="List Users"
            target={
              <DataLoaderProvider>
                <APIProvider>
                  <Users />
                </APIProvider>
              </DataLoaderProvider>
            }
          />
        </ActionPanel>
      }
    />
    <Grid.Item
      key="Applications"
      title="Applications"
      content={{
        source: {
          dark: 'icons/iam-application@dark.svg',
          light: 'icons/iam-application@light.svg',
        },
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="List Applications"
            target={
              <DataLoaderProvider>
                <APIProvider>
                  <Applications />
                </APIProvider>
              </DataLoaderProvider>
            }
          />
        </ActionPanel>
      }
    />
    <Grid.Item
      key="Groups"
      title="Groups"
      content={{
        source: {
          dark: 'icons/iam-group@dark.svg',
          light: 'icons/iam-group@light.svg',
        },
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="List Groups"
            target={
              <DataLoaderProvider>
                <APIProvider>
                  <Groups />
                </APIProvider>
              </DataLoaderProvider>
            }
          />
        </ActionPanel>
      }
    />
    <Grid.Item
      key="keys"
      title="API Keys"
      content={{
        source: {
          dark: 'icons/iam-policy@dark.svg',
          light: 'icons/iam-policy@light.svg',
        },
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="List API Keys"
            target={
              <DataLoaderProvider>
                <APIProvider>
                  <APIkeys />
                </APIProvider>
              </DataLoaderProvider>
            }
          />
        </ActionPanel>
      }
    />
    <Grid.Item
      key="policies"
      title="Policies"
      content={{
        source: {
          dark: 'icons/iam-policy@dark.svg',
          light: 'icons/iam-policy@light.svg',
        },
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="List Policies"
            target={
              <DataLoaderProvider>
                <APIProvider>
                  <Policies />
                </APIProvider>
              </DataLoaderProvider>
            }
          />
        </ActionPanel>
      }
    />
  </Grid>
)
