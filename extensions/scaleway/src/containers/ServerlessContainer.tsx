import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Containers } from './Containers'

export const ServerlessContainer = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Containers />
    </APIProvider>
  </DataLoaderProvider>
)
