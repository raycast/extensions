import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Functions } from './Functions'

export const ServerlessFunctions = () => (
  <DataLoaderProvider>
    <Functions />
  </DataLoaderProvider>
)
