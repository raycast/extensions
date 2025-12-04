import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { Instances } from './Instances'

export const Databases = () => (
  <DataLoaderProvider>
    <Instances />
  </DataLoaderProvider>
)
