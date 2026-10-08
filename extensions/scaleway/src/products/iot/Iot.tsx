import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Hubs } from './Hubs'

export const Iot = () => (
  <DataLoaderProvider>
    <Hubs />
  </DataLoaderProvider>
)
