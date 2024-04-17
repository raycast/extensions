import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Containers } from './Containers'

export const ServerlessContainer = () => (
  <DataLoaderProvider>
    <Containers />
  </DataLoaderProvider>
)
