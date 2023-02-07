import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../providers'
import { Functions } from './Functions'

export const ServerlessFunctions = () => (
  <DataLoaderProvider>
    <APIProvider>
      <Functions />
    </APIProvider>
  </DataLoaderProvider>
)
