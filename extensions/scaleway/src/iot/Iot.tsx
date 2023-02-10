import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Hubs } from './Hubs'

export const Iot = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Hubs />
    </APIProvider>
  </DataLoaderProvider>
)
