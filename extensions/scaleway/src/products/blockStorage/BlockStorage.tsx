import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from 'providers'
import { Volumes } from './Volumes'

export const BlockStorage = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Volumes />
    </APIProvider>
  </DataLoaderProvider>
)
