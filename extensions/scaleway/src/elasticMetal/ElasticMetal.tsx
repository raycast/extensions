import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Servers } from './Servers'

export const ElasticMetal = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Servers />
    </APIProvider>
  </DataLoaderProvider>
)
