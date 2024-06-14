import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Volumes } from './Volumes'

export const BlockStorage = () => (
  <DataLoaderProvider>
    <Volumes />
  </DataLoaderProvider>
)
