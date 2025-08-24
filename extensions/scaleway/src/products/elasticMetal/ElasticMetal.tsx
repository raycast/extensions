import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Servers } from './Servers'

export const ElasticMetal = () => (
  <DataLoaderProvider>
    <Servers />
  </DataLoaderProvider>
)
