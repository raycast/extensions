import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Servers } from './Servers'

export const Instance = () => (
  <DataLoaderProvider>
    <Servers />
  </DataLoaderProvider>
)
