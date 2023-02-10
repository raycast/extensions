import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Clusters } from './Clusters'

export const Redis = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Clusters />
    </APIProvider>
  </DataLoaderProvider>
)
