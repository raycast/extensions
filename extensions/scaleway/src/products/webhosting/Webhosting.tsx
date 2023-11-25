import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from 'providers'
import { Hostings } from './Hostings'

export const Webhosting = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Hostings />
    </APIProvider>
  </DataLoaderProvider>
)
