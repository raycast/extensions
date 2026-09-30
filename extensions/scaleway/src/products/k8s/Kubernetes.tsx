import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Clusters } from './Clusters'

export const Kubernetes = () => (
  <DataLoaderProvider>
    <Clusters />
  </DataLoaderProvider>
)
