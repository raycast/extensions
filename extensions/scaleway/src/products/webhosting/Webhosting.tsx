import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Hostings } from './Hostings'

export const Webhosting = () => (
  <DataLoaderProvider>
    <Hostings />
  </DataLoaderProvider>
)
